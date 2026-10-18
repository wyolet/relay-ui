import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

/** A dashboard with a catalog (so it shows the ops blocks) and empty usage. */
async function dashboard(page: Page, health: { status: number; body: object }) {
	await page.addInitScript(() =>
		localStorage.setItem(
			"relay-setup",
			JSON.stringify({ state: { dismissed: true }, version: 0 }),
		),
	);
	await mockApi(page, {
		...EMPTY_GRAPH,
		roles: ["admin"],
		providers: [{ metadata: { id: "p1", name: "anthropic" }, spec: {} }],
		// With no keys issued a fresh install is steered into setup instead.
		keys: [{ metadata: { id: "k1", name: "ci" }, spec: {} }],
	});
	await page.route(/\/api\/usage\/timeseries/, (route) =>
		route.fulfill({ json: { from: "", to: "", interval: "1h", rows: [] } }),
	);
	await page.route(/\/api\/healthz$/, (route) =>
		route.fulfill({ status: health.status, json: health.body }),
	);
	await page.goto("/");
}

test.describe("Dashboard health", () => {
	test("a degraded backend shows in Needs attention", async ({ page }) => {
		await dashboard(page, {
			status: 503,
			body: {
				status: "degraded",
				backends: { pg: "error", redis: "ok" },
				master_key_configured: false,
			},
		});
		await expect(page.getByText("Database is down")).toBeVisible();
		await expect(page.getByText("No master key configured")).toBeVisible();
		await expect(page.getByText("Session & rate-limit store is down")).toHaveCount(0);
	});

	test("healthy backends stay quiet", async ({ page }) => {
		await dashboard(page, {
			status: 200,
			body: { status: "ok", backends: { pg: "ok" } },
		});
		await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
		await expect(page.getByText(/is down/)).toHaveCount(0);
		// An absent flag is unknown, not "no master key".
		await expect(page.getByText("No master key configured")).toHaveCount(0);
	});
});
