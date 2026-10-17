import { expect, type Page, type Route, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const project = {
	metadata: { id: "p-1", name: "acme", displayName: "Acme" },
	spec: { teamId: "t-1", enabled: true },
};
const serviceAccount = {
	metadata: { id: "sa-1", name: "ci-bot", displayName: "CI bot" },
	spec: { projectId: "p-1", enabled: true },
};
const user = { id: "u-1", username: "alice", roles: [], disabled: false };

function json(route: Route, body: unknown, status = 200) {
	return route.fulfill({
		status,
		contentType: "application/json",
		body: JSON.stringify(body),
	});
}

function apiError(route: Route, status: number, message: string) {
	return json(route, { error: { type: "api_error", message } }, status);
}

/** Answers the identity lists and detail reads the erase entry points need. */
async function mockIdentity(page: Page, roles: string[]) {
	await mockApi(page, { ...EMPTY_GRAPH, roles });
	await page.route(/\/api\/projects(\?.*)?$/, (r) =>
		json(r, { items: [project], total: 1 }),
	);
	await page.route(/\/api\/projects\/acme(\?.*)?$/, (r) => json(r, project));
	await page.route(/\/api\/service-accounts(\?.*)?$/, (r) =>
		json(r, { items: [serviceAccount], total: 1 }),
	);
	await page.route(/\/api\/service-accounts\/ci-bot(\?.*)?$/, (r) =>
		json(r, serviceAccount),
	);
	await page.route(/\/api\/users(\?.*)?$/, (r) => json(r, { items: [user] }));
	await page.route(/\/api\/logs(\?.*)?$/, (r) => json(r, { logs: [] }));
	await page.route(/\/api\/usage\/timeseries(\?.*)?$/, (r) =>
		json(r, { rows: [] }),
	);
}

type EraseAnswer = { requests: number } | { status: number; message: string };

async function mockErase(page: Page, answer: EraseAnswer) {
	const bodies: unknown[] = [];
	await page.route("**/api/logs/erase", (route) => {
		bodies.push(route.request().postDataJSON());
		return "status" in answer
			? apiError(route, answer.status, answer.message)
			: json(route, answer);
	});
	return bodies;
}

const eraseButton = (page: Page) =>
	page.getByRole("button", { name: "Erase bodies" });

test.describe("Erase captured bodies", () => {
	test("from a project: typed confirm, then the count", async ({ page }) => {
		await mockIdentity(page, ["admin"]);
		const bodies = await mockErase(page, { requests: 3 });

		await page.goto("/projects/acme");
		await eraseButton(page).click();
		const dialog = page.getByRole("dialog");
		await expect(dialog).toContainText("Permanently deletes");
		await expect(dialog).toContainText("Usage rows (tokens, cost, timing) stay");
		await expect(dialog).toContainText("for project Acme");

		const confirm = dialog.getByRole("button", { name: "Erase bodies" });
		await expect(confirm).toBeDisabled();
		await dialog.getByLabel("Type acme to confirm").fill("acm");
		await expect(confirm).toBeDisabled();
		await dialog.getByLabel("Type acme to confirm").fill("acme");
		await confirm.click();

		await expect(dialog).toContainText(
			"Erased the bodies of 3 captured requests for project Acme",
		);
		expect(bodies).toEqual([{ projectId: "p-1" }]);
	});

	test("from a service account: the principal scope", async ({ page }) => {
		await mockIdentity(page, ["admin"]);
		const bodies = await mockErase(page, { requests: 1 });

		await page.goto("/service-accounts/ci-bot");
		await eraseButton(page).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByLabel("Type ci-bot to confirm").fill("ci-bot");
		await dialog.getByRole("button", { name: "Erase bodies" }).click();

		await expect(dialog).toContainText("1 captured request for");
		expect(bodies).toEqual([{ principalId: "sa-1" }]);
	});

	test("from a user page", async ({ page }) => {
		await mockIdentity(page, ["admin"]);
		const bodies = await mockErase(page, { requests: 0 });

		await page.goto("/users/u-1");
		await eraseButton(page).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByLabel("Type alice to confirm").fill("alice");
		await dialog.getByRole("button", { name: "Erase bodies" }).click();

		await expect(dialog).toContainText("0 captured requests for user alice");
		expect(bodies).toEqual([{ principalId: "u-1" }]);
	});

	test("from logs: both pickers narrow to the principal in the project", async ({
		page,
	}) => {
		await mockIdentity(page, ["admin"]);
		const bodies = await mockErase(page, { requests: 2 });

		await page.goto("/logs");
		await eraseButton(page).click();
		const dialog = page.getByRole("dialog");
		await expect(dialog.getByRole("button", { name: "Erase bodies" })).toBeDisabled();

		await dialog.getByRole("combobox", { name: "Project" }).click();
		await page.getByRole("option", { name: "Acme" }).click();
		await dialog
			.getByRole("combobox", { name: "User or service account" })
			.click();
		await page.getByRole("option", { name: "CI bot (service account)" }).click();

		await expect(dialog).toContainText("for service account CI bot in project Acme");
		await dialog.getByLabel("Type ci-bot to confirm").fill("ci-bot");
		await dialog.getByRole("button", { name: "Erase bodies" }).click();

		await expect(dialog).toContainText("Erased the bodies of 2");
		expect(bodies).toEqual([{ projectId: "p-1", principalId: "sa-1" }]);
	});

	test("a backend that can't erase says so inline", async ({ page }) => {
		await mockIdentity(page, ["admin"]);
		await mockErase(page, {
			status: 501,
			message: "the payload backend cannot erase captured bodies",
		});

		await page.goto("/projects/acme");
		await eraseButton(page).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByLabel("Type acme to confirm").fill("acme");
		await dialog.getByRole("button", { name: "Erase bodies" }).click();

		await expect(dialog).toContainText(
			"This relay's payload store can't erase captured bodies",
		);
		await expect(dialog).toContainText("cannot erase captured bodies");
		await expect(dialog.getByRole("button", { name: "Erase bodies" })).toBeVisible();
	});

	test("a failure part-way warns that some bodies may be gone", async ({
		page,
	}) => {
		await mockIdentity(page, ["admin"]);
		await mockErase(page, { status: 500, message: "clickhouse: timeout" });

		await page.goto("/users/u-1");
		await eraseButton(page).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByLabel("Type alice to confirm").fill("alice");
		await dialog.getByRole("button", { name: "Erase bodies" }).click();

		await expect(dialog).toContainText("some bodies may already be gone");
		await expect(dialog).toContainText("clickhouse: timeout");
	});

	test("non-admins get no erase button anywhere", async ({ page }) => {
		await mockIdentity(page, []);

		for (const path of ["/logs", "/projects/acme", "/service-accounts/ci-bot"]) {
			await page.goto(path);
			await expect(page.locator("h1").first()).toBeVisible();
			await expect(eraseButton(page)).toHaveCount(0);
		}
	});
});

test.describe("Token signing key", () => {
	async function mockRotate(page: Page, status: number, message = "") {
		const calls: string[] = [];
		await page.route("**/api/auth/token/keys/rotate", (route) => {
			calls.push(route.request().method());
			return status === 204
				? route.fulfill({ status: 204 })
				: apiError(route, status, message);
		});
		return calls;
	}

	test("rotate explains what it doesn't revoke, then rotates", async ({
		page,
	}) => {
		await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
		const calls = await mockRotate(page, 204);

		await page.goto("/settings/tokens");
		await page.getByRole("button", { name: "Rotate signing key" }).click();
		const confirm = page.getByRole("alertdialog");
		await expect(confirm).toContainText(
			"tokens already minted keep working until they expire",
		);
		await expect(confirm).toContainText("rotating revokes nothing");
		await confirm.getByRole("button", { name: "Rotate key" }).click();

		await expect(page.getByText("Signing key rotated")).toBeVisible();
		expect(calls).toEqual(["POST"]);
	});

	test("cancelling the confirm sends nothing", async ({ page }) => {
		await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
		const calls = await mockRotate(page, 204);

		await page.goto("/settings/tokens");
		await page.getByRole("button", { name: "Rotate signing key" }).click();
		await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
		expect(calls).toEqual([]);
	});

	test("a relay without tokens configured shows it inline", async ({ page }) => {
		await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
		await mockRotate(
			page,
			503,
			"tokens_disabled: no signing-key store is configured",
		);

		await page.goto("/settings/tokens");
		await page.getByRole("button", { name: "Rotate signing key" }).click();
		await page.getByRole("alertdialog").getByRole("button", { name: "Rotate key" }).click();

		await expect(
			page.getByText("Inference tokens aren't configured on this relay"),
		).toBeVisible();
		await expect(page.getByText("no signing-key store is configured")).toBeVisible();
	});

	test("other failures toast the server's message", async ({ page }) => {
		await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
		await mockRotate(page, 500, "signing-key rotation failed: disk full");

		await page.goto("/settings/tokens");
		await page.getByRole("button", { name: "Rotate signing key" }).click();
		await page.getByRole("alertdialog").getByRole("button", { name: "Rotate key" }).click();

		await expect(page.getByText("signing-key rotation failed: disk full")).toBeVisible();
		await expect(
			page.getByText("Inference tokens aren't configured on this relay"),
		).toHaveCount(0);
	});

	test("non-admins see why there is no rotate button", async ({ page }) => {
		await mockApi(page, EMPTY_GRAPH);

		await page.goto("/settings/tokens");
		await expect(
			page.getByText("Only an admin can rotate the signing key"),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Rotate signing key" })).toHaveCount(0);
	});
});

test.describe("Host key env name", () => {
	test("hints when the name uses a prefix relay reserves", async ({ page }) => {
		await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });

		await page.goto("/host-keys/new");
		await page.getByRole("combobox").filter({ hasText: "Stored value" }).click();
		await page.getByRole("option", { name: /^Environment variable/ }).click();

		const env = page.getByPlaceholder("OPENAI_API_KEY");
		await env.fill("relay_master_key");
		await expect(page.getByText(/Names starting with RELAY_ are reserved/)).toBeVisible();

		await env.fill("Wyolet_token");
		await expect(page.getByText(/Names starting with WYOLET_ are reserved/)).toBeVisible();

		await env.fill("OPENAI_API_KEY");
		await expect(page.getByText(/are reserved/)).toHaveCount(0);
	});
});
