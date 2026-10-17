import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi, mockSignedOut } from "./fixtures/mockApi";

async function signedOutWithSso(page: Page) {
	await mockApi(page, { ...EMPTY_GRAPH, features: { oidc: true } });
	await mockSignedOut(page);
}

const NOTICES: [code: string, notice: string][] = [
	["account_disabled", "Your account is disabled. Contact your administrator."],
	[
		"registration_closed",
		"There's no account for this sign-in and registration is closed. Ask an administrator for access.",
	],
	[
		"email_in_use",
		"An account with this email already exists. Ask an administrator to link your sign-in.",
	],
	[
		"identity_conflict",
		"This sign-in can't be matched to a single account. Contact your administrator.",
	],
	["exchange_failed", "The identity provider sign-in failed. Try again."],
	[
		"flow_expired",
		"The sign-in took too long or was interrupted. Try again.",
	],
	["login_failed", "Sign-in failed."],
	["not_a_code_relay_sends", "Sign-in failed."],
];

test.describe("Sign-in errors", () => {
	for (const [code, notice] of NOTICES) {
		test(`?error=${code} shows its notice once`, async ({ page }) => {
			await signedOutWithSso(page);

			await page.goto(`/login?error=${code}`);
			await expect(page.getByRole("status")).toHaveText(notice);
			await expect(page).toHaveURL(/\/login$/);

			await page.reload();
			await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
			await expect(page.getByRole("status")).toHaveCount(0);
		});
	}

	test("SSO starts with return_to and comes back with the failure", async ({
		page,
	}) => {
		await signedOutWithSso(page);
		const starts: string[] = [];
		await page.route("**/api/auth/oidc/start**", (route) => {
			const url = new URL(route.request().url());
			starts.push(url.search);
			const returnTo = url.searchParams.get("return_to") ?? "";
			return route.fulfill({
				status: 302,
				headers: { location: `${returnTo}?error=state_mismatch` },
			});
		});

		await page.goto("/login");
		await page.getByRole("button", { name: "Continue with SSO" }).click();

		await expect(page.getByRole("status")).toHaveText(
			"The sign-in took too long or was interrupted. Try again.",
		);
		await expect(page).toHaveURL(/\/login$/);
		const returnTo = new URL("/login", page.url()).href;
		const query = `?${new URLSearchParams({ return_to: returnTo })}`;
		expect(starts).toEqual([query]);
	});
});
