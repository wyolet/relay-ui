import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const HOUR = 3_600_000_000_000;
const SIGNING_KEY = { kind: "stored", id: "auth-token-signing-key" };

async function mockAuthTokens(page: Page) {
	const puts: unknown[] = [];
	const value = {
		enabled: true,
		defaultTTL: HOUR,
		maxTTL: 24 * HOUR,
		signingKey: SIGNING_KEY,
	};
	await page.route("**/api/settings/auth:tokens", (route) => {
		const req = route.request();
		const body = req.method() === "PUT" ? req.postDataJSON() : value;
		if (req.method() === "PUT") puts.push(body);
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ section: "auth:tokens", value: body }),
		});
	});
	return puts;
}

test.describe("Inference token settings", () => {
	test("loads lifetimes in the largest whole unit", async ({ page }) => {
		await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
		await mockAuthTokens(page);

		await page.goto("/settings/tokens");
		await expect(
			page.getByRole("spinbutton", { name: "Default token lifetime" }),
		).toHaveValue("1");
		await expect(
			page.getByRole("combobox", { name: "Default token lifetime unit" }),
		).toContainText("hours");
		await expect(
			page.getByRole("combobox", { name: "Maximum token lifetime unit" }),
		).toContainText("days");
	});

	test("an admin saves the section as nanoseconds, keeping the key ref", async ({
		page,
	}) => {
		await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
		const puts = await mockAuthTokens(page);

		await page.goto("/settings/tokens");
		await page.getByRole("switch", { name: "Allow inference tokens" }).click();
		await page
			.getByRole("spinbutton", { name: "Default token lifetime" })
			.fill("30");
		await page
			.getByRole("combobox", { name: "Default token lifetime unit" })
			.click();
		await page.getByRole("option", { name: "minutes" }).click();
		await page
			.getByRole("spinbutton", { name: "Verified-token cache size" })
			.fill("-1");
		await page.getByRole("button", { name: "Save changes" }).click();

		await expect.poll(() => puts.length).toBe(1);
		expect(puts[0]).toEqual({
			enabled: false,
			defaultTTL: HOUR / 2,
			maxTTL: 24 * HOUR,
			verifyCacheSize: -1,
			signingKey: SIGNING_KEY,
		});
	});

	test("a default longer than the maximum is refused on the field", async ({
		page,
	}) => {
		await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
		const puts = await mockAuthTokens(page);

		await page.goto("/settings/tokens");
		const field = page.getByRole("spinbutton", {
			name: "Default token lifetime",
		});
		await field.fill("48");
		await page.getByRole("button", { name: "Save changes" }).click();

		await expect(
			page.getByText("Can't be longer than the maximum lifetime."),
		).toBeVisible();
		await expect(field).toHaveAttribute("aria-invalid", "true");
		expect(puts).toEqual([]);
	});

	test("non-admins see the section read-only", async ({ page }) => {
		await mockApi(page, EMPTY_GRAPH);
		await mockAuthTokens(page);

		await page.goto("/settings/tokens");
		await expect(
			page.getByText("Only an admin can change inference token settings"),
		).toBeVisible();
		await expect(
			page.getByRole("switch", { name: "Allow inference tokens" }),
		).toBeDisabled();
		await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
		await expect(
			page.getByRole("button", { name: "Rotate signing key" }),
		).toHaveCount(0);
	});
});
