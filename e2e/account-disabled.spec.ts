import { expect, type Page, type Route, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi, mockSignedOut } from "./fixtures/mockApi";

const NOTICE = "Your account is disabled. Contact your administrator.";

function accountDisabled(route: Route) {
	return route.fulfill({
		status: 401,
		contentType: "application/json",
		body: JSON.stringify({
			error: {
				type: "authentication_error",
				code: "account_disabled",
				message: "account is disabled; contact your administrator",
			},
		}),
	});
}

/** Records every /auth/logout call; relay has already ended the session. */
async function trackLogout(page: Page) {
	const calls: string[] = [];
	await page.route("**/api/auth/logout", (route) => {
		calls.push(route.request().method());
		return route.fulfill({ status: 204 });
	});
	return calls;
}

test.describe("Disabled account", () => {
	test("mid-session: any call drops to sign-in with the notice", async ({
		page,
	}) => {
		await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
		const logout = await trackLogout(page);

		await page.goto("/policies");
		await expect(page.locator("h1").first()).toBeVisible();

		await page.route(/\/api\/keys(\?.*)?$/, accountDisabled);
		await page.getByRole("link", { name: "Keys", exact: true }).click();

		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole("status")).toHaveText(NOTICE);
		await expect(page.getByText("account is disabled; contact")).toHaveCount(0);
		expect(logout).toEqual([]);
	});

	test("mid-session: a refused write drops to sign-in, not a toast", async ({
		page,
	}) => {
		await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
		await page.route("**/api/auth/token/keys/rotate", accountDisabled);

		await page.goto("/settings/tokens");
		await page.getByRole("button", { name: "Rotate signing key" }).click();
		await page
			.getByRole("alertdialog")
			.getByRole("button", { name: "Rotate key" })
			.click();

		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole("status")).toHaveText(NOTICE);
		await expect(page.getByText("account is disabled; contact")).toHaveCount(0);
	});

	test("on page load: the whoami answer carries the notice", async ({
		page,
	}) => {
		await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
		let answered = false;
		await page.route("**/api/auth/whoami", (route) => {
			// relay answers account_disabled once, then the session is gone.
			if (answered) {
				return route.fulfill({
					status: 401,
					contentType: "application/json",
					body: JSON.stringify({
						error: { type: "authentication_error", message: "no session" },
					}),
				});
			}
			answered = true;
			return accountDisabled(route);
		});

		await page.goto("/logs");

		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole("status")).toHaveText(NOTICE);
	});

	test("at login: the attempt shows the notice", async ({ page }) => {
		await mockApi(page, EMPTY_GRAPH);
		await mockSignedOut(page);
		await page.route("**/api/auth/login", accountDisabled);
		const logout = await trackLogout(page);

		await page.goto("/login");
		await page.getByLabel("Username").fill("alice");
		await page.getByLabel("Password", { exact: true }).fill("hunter2");
		await page.getByRole("button", { name: "Sign in" }).click();

		await expect(page.getByRole("alert")).toHaveText(NOTICE);
		await expect(page).toHaveURL(/\/login$/);
		expect(logout).toEqual([]);
	});
});
