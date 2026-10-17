import { expect, type Page, test } from "@playwright/test";
import {
	type AccessReviewBody,
	EMPTY_GRAPH,
	type MockGraph,
	type MockResponse,
	mockApi,
} from "./fixtures/mockApi";

const serviceAccount = {
	metadata: { id: "sa-1", name: "ci-deployer", displayName: "CI deployer" },
	spec: { projectId: "p-1", enabled: true },
};

const PROBE_OK: MockResponse = {
	body: {
		allowed: true,
		reason: "rule",
		rule: "system-role-read",
		action: "roles.list",
		resource: { kind: "roles" },
		subject: { kind: "user", name: "test", admin: false },
	},
};

const SINGLE_MODE: MockResponse = {
	status: 501,
	body: {
		error: {
			type: "not_implemented",
			message: "access review needs RELAY_AUTHZ=rbac",
		},
	},
};

/** Answers the availability probe, then hands every real check to `check`. */
function rbac(
	check: (body: AccessReviewBody) => MockResponse,
	requests: AccessReviewBody[] = [],
): MockGraph["accessReview"] {
	return (body) => {
		if (!body.subject && body.action === "roles.list") return PROBE_OK;
		requests.push(body);
		return check(body);
	};
}

async function openSelfCheck(page: Page): Promise<void> {
	await page.goto("/");
	await page.getByRole("button", { name: /test/ }).click();
	await page.getByRole("menuitem", { name: "Check my access" }).click();
	await expect(
		page.getByRole("dialog", { name: "Check my access" }),
	).toBeVisible();
}

async function checkRow(page: Page, name: string): Promise<void> {
	await page.getByLabel("Name").fill(name);
	await page.getByRole("button", { name: "Check", exact: true }).click();
}

test.describe("Access check", () => {
	test("an admin checks a service account allowed via a role binding", async ({
		page,
	}) => {
		const requests: AccessReviewBody[] = [];
		await mockApi(page, {
			...EMPTY_GRAPH,
			roles: ["admin"],
			serviceAccounts: [serviceAccount],
			accessReview: rbac(
				(body) => ({
					body: {
						allowed: true,
						reason: "binding",
						action: body.action,
						resource: { kind: "key", name: "ci-key" },
						binding: {
							name: "ml-devs",
							role: { kind: "role", name: "developer" },
							scope: { kind: "project", name: "ml" },
							subject: { kind: "group", name: "eng" },
						},
						chain: [{ kind: "project", name: "ml" }, { kind: "system" }],
						subject: {
							kind: "serviceaccount",
							name: "ci-deployer",
							admin: false,
						},
					},
				}),
				requests,
			),
		});

		await page.goto("/service-accounts/ci-deployer");
		await page.getByRole("button", { name: "Check access" }).click();
		await checkRow(page, "ci-key");

		const result = page.getByRole("region", { name: "Access check result" });
		await expect(result.getByText("Allowed")).toBeVisible();
		await expect(
			result.getByText(
				"role binding ml-devs grants developer at project ml to group eng",
			),
		).toBeVisible();
		await expect(result.getByText("project ml → global")).toBeVisible();
		expect(requests[0]).toEqual({
			subject: { kind: "serviceaccount", name: "ci-deployer" },
			action: "keys.get",
			resource: { kind: "keys", name: "ci-key" },
		});
	});

	test("a user checks themselves, allowed via a relay rule", async ({
		page,
	}) => {
		const requests: AccessReviewBody[] = [];
		await mockApi(page, {
			...EMPTY_GRAPH,
			accessReview: rbac(
				(body) => ({
					body: {
						allowed: true,
						reason: "rule",
						rule: "personal-row",
						action: body.action,
						resource: { kind: "key", name: "mine" },
						subject: { kind: "user", name: "test", admin: false },
					},
				}),
				requests,
			),
		});

		await openSelfCheck(page);
		await checkRow(page, "mine");

		await expect(page.getByText("relay rule: personal row")).toBeVisible();
		expect(requests[0]?.subject).toBeUndefined();
	});

	test("a denied check flags a disabled account", async ({ page }) => {
		await mockApi(page, {
			...EMPTY_GRAPH,
			roles: ["admin"],
			serviceAccounts: [serviceAccount],
			accessReview: rbac((body) => ({
				body: {
					allowed: false,
					reason: "none",
					action: body.action,
					resource: { kind: "key", name: "ci-key" },
					subject: {
						kind: "serviceaccount",
						name: "ci-deployer",
						admin: false,
						disabled: true,
					},
				},
			})),
		});

		await page.goto("/service-accounts/ci-deployer");
		await page.getByRole("button", { name: "Check access" }).click();
		await checkRow(page, "ci-key");

		const result = page.getByRole("region", { name: "Access check result" });
		await expect(result.getByText("Denied")).toBeVisible();
		await expect(
			result.getByText("no rule or role binding grants it"),
		).toBeVisible();
		await expect(result.getByText("Account disabled")).toBeVisible();
	});

	test("a resource the caller cannot see answers not found", async ({
		page,
	}) => {
		await mockApi(page, {
			...EMPTY_GRAPH,
			accessReview: rbac(() => ({
				status: 404,
				body: {
					error: { type: "not_found_error", message: "key ghost not found" },
				},
			})),
		});

		await openSelfCheck(page);
		await checkRow(page, "ghost");

		await expect(page.getByText("Not found", { exact: true })).toBeVisible();
		await expect(page.getByText("key ghost not found")).toBeVisible();
	});

	test("under single authz the entry points are hidden", async ({ page }) => {
		await mockApi(page, {
			...EMPTY_GRAPH,
			roles: ["admin"],
			serviceAccounts: [serviceAccount],
			accessReview: () => SINGLE_MODE,
		});

		const probed = page.waitForResponse("**/api/access-review");
		await page.goto("/service-accounts/ci-deployer");
		await probed;
		await expect(
			page.getByRole("heading", { name: /CI deployer/ }),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Check access" })).toHaveCount(
			0,
		);

		await page.getByRole("button", { name: /test/ }).click();
		await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
		await expect(
			page.getByRole("menuitem", { name: "Check my access" }),
		).toHaveCount(0);
	});

	test("a non-admin cannot check a service account", async ({ page }) => {
		await mockApi(page, {
			...EMPTY_GRAPH,
			serviceAccounts: [serviceAccount],
			accessReview: rbac(() => PROBE_OK),
		});

		const probed = page.waitForResponse("**/api/access-review");
		await page.goto("/service-accounts/ci-deployer");
		await probed;
		await expect(
			page.getByRole("heading", { name: /CI deployer/ }),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Check access" })).toHaveCount(
			0,
		);
	});
});
