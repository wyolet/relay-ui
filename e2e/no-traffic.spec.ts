import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

/** An admin on a relay with a catalog and keys but no usage in any window. */
async function noTraffic(page: Page) {
	await page.addInitScript(() =>
		sessionStorage.setItem(
			"relay-setup",
			JSON.stringify({ state: { dismissed: true }, version: 0 }),
		),
	);
	await mockApi(page, {
		...EMPTY_GRAPH,
		roles: ["admin"],
		providers: [{ metadata: { id: "p1", name: "anthropic" }, spec: {} }],
		keys: [{ metadata: { id: "k1", name: "ci" }, spec: {} }],
	});
	await page.route(/\/api\/usage\/(summary|timeseries)/, (route) =>
		route.fulfill({ json: { from: "", to: "", interval: "1h", rows: [] } }),
	);
	await page.route(/\/api\/usage\/facets/, (route) =>
		route.fulfill({ json: { from: "", to: "", facets: {} } }),
	);
}

test.describe("No traffic", () => {
	test("the dashboard says so once and keeps Needs attention", async ({
		page,
	}) => {
		await noTraffic(page);
		await page.goto("/");
		await expect(
			page.getByRole("heading", { name: "No traffic last 7 days" }),
		).toBeVisible();
		await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "In numbers" })).toHaveCount(0);
		await expect(page.getByRole("heading", { name: "Breakdown" })).toHaveCount(0);
	});

	test("usage without filters names the range", async ({ page }) => {
		await noTraffic(page);
		await page.goto("/usage");
		await expect(
			page.getByRole("heading", { name: "No traffic this week" }),
		).toBeVisible();
		await expect(page.getByRole("heading", { name: "Breakdown" })).toHaveCount(0);
	});

	test("filtered usage offers to clear the filters, keeping the view", async ({
		page,
	}) => {
		await noTraffic(page);
		await page.goto('/usage?lens=spend&model_id=%5B%22m1%22%5D');
		await expect(
			page.getByRole("heading", { name: "No traffic matches these filters" }),
		).toBeVisible();
		await page.getByRole("link", { name: "Clear filters →" }).click();
		await expect(page).toHaveURL(/\/usage\?lens=spend$/);
		await expect(
			page.getByRole("heading", { name: "No traffic this week" }),
		).toBeVisible();
	});
});
