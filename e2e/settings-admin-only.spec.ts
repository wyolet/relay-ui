import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const oidc = {
	section: "auth:oidc",
	value: {
		enabled: true,
		issuer: "https://idp.example.com",
		clientId: "relay",
		clientSecretEnv: "RELAY_OIDC_CLIENT_SECRET",
		registration: "closed",
	},
};

const payloadLogging = {
	section: "payload-logging",
	value: { enabled: true, maxBytes: 65536, backend: "file" },
};

const forbidden = {
	error: { type: "permission_error", message: "forbidden" },
};

async function mockSection(
	page: Page,
	path: string,
	status: number,
	body: unknown,
): Promise<void> {
	await page.route(`**/api/settings/${path}`, (route) =>
		route.request().method() === "GET"
			? route.fulfill({
					status,
					contentType: "application/json",
					body: JSON.stringify(body),
				})
			: route.fallback(),
	);
}

test.describe("Admin-only settings", () => {
	test("a non-admin sees SSO settings read-only", async ({ page }) => {
		await mockApi(page, EMPTY_GRAPH);
		await mockSection(page, "auth:oidc", 200, oidc);

		await page.goto("/settings/sso");
		await expect(
			page.getByText("Only an admin can change SSO settings"),
		).toBeVisible();
		await expect(page.getByLabel("Issuer URL")).toHaveValue(
			"https://idp.example.com",
		);
		await expect(page.getByLabel("Issuer URL")).toHaveAttribute("readonly", "");
		await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(
			0,
		);
	});

	test("a non-admin refused the SSO read gets a no-access state", async ({
		page,
	}) => {
		await mockApi(page, EMPTY_GRAPH);
		await mockSection(page, "auth:oidc", 403, forbidden);

		await page.goto("/settings/sso");
		await expect(
			page.getByText("Only admins can view SSO settings"),
		).toBeVisible();
		await expect(page.getByText("You don't have access to this view")).toHaveCount(
			0,
		);
	});

	test("an admin can edit SSO settings", async ({ page }) => {
		await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
		await mockSection(page, "auth:oidc", 200, oidc);

		await page.goto("/settings/sso");
		await expect(
			page.getByRole("button", { name: "Save changes" }),
		).toBeVisible();
		await expect(
			page.getByText("Only an admin can change SSO settings"),
		).toHaveCount(0);
	});

	test("a non-admin sees payload logging read-only", async ({ page }) => {
		await mockApi(page, EMPTY_GRAPH);
		await mockSection(page, "payload-logging", 200, payloadLogging);

		await page.goto("/settings/payload-logging");
		await expect(
			page.getByText("Only an admin can change payload logging"),
		).toBeVisible();
		await expect(
			page.getByRole("switch", { name: "Enable payload logging" }),
		).toBeDisabled();
		await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(
			0,
		);
	});
});
