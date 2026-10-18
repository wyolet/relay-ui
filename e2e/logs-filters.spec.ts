import { expect, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

test("a Logs dimension filter reaches the feed request", async ({ page }) => {
	await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
	const feeds: URLSearchParams[] = [];
	await page.route(/\/api\/logs(\?|$)/, (route) => {
		feeds.push(new URL(route.request().url()).searchParams);
		return route.fulfill({
			json: {
				logs: [
					{ request_id: "r1", ts: new Date().toISOString(), status: 200, duration_ms: 5, source: "pipeline" },
				],
				total: 10000,
				total_capped: true,
			},
		});
	});
	await page.route(/\/api\/usage\/summary/, (route) => {
		const g = new URL(route.request().url()).searchParams.get("group_by");
		const rows =
			g === "team_id"
				? [
						{
							group: { team_id: "t-research" },
							requests: 12,
							error_count: 0,
							duration_ms: { avg: 1, max: 1, p50: 1, p95: 1, p99: 1 },
							tokens: {},
							cost_nanos: 0,
							unpriced: 0,
							first_seen: "",
							last_seen: "",
						},
					]
				: [];
		return route.fulfill({ json: { from: "", to: "", rows } });
	});
	await page.route(/\/api\/usage\/timeseries/, (route) =>
		route.fulfill({ json: { from: "", to: "", interval: "1h", rows: [] } }),
	);

	await page.goto("/logs");
	// The first page asks for the match count; a capped answer reads "10,000+".
	await expect(page.getByText("10,000+ matching requests · 1 loaded")).toBeVisible();
	expect(feeds[0]?.get("count")).toBe("true");
	await page.getByRole("button", { name: "Filter", exact: true }).click();
	await page.getByRole("button", { name: "Team" }).click();
	await page.getByText("t-research · 12").click();
	await page.keyboard.press("Escape");

	await expect(page.getByRole("button", { name: "Clear Team filter" })).toBeVisible();
	await expect
		.poll(() => feeds.some((q) => q.getAll("team_id").includes("t-research")))
		.toBe(true);
	// Defaults stay out of the URL.
	expect(page.url()).not.toContain("host_id");
});
