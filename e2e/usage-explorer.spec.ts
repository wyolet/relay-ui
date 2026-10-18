import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const MODELS = [
	{ metadata: { id: "m-opus", name: "opus" }, spec: {} },
	{ metadata: { id: "m-haiku", name: "haiku" }, spec: {} },
];

function row(group: Record<string, string>, requests: number) {
	const dur = { avg: 1, max: 1, p50: 1, p95: 1, p99: 1 };
	return {
		group,
		requests,
		error_count: 0,
		duration_ms: dur,
		tokens: { input: requests },
		cost_nanos: requests * 1_000_000,
		unpriced: 0,
		first_seen: "2026-01-01T00:00:00Z",
		last_seen: "2026-01-01T00:00:00Z",
	};
}

/** Answers /usage/summary by group-by and records each request's filters. */
async function mockUsage(page: Page) {
	await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"], models: MODELS });
	const summaries: URLSearchParams[] = [];
	await page.route(/\/api\/usage\/summary/, (route) => {
		const q = new URL(route.request().url()).searchParams;
		summaries.push(q);
		const g = q.get("group_by") ?? "";
		const rows =
			g === "model_id"
				? [row({ model_id: "m-opus" }, 30), row({ model_id: "m-haiku" }, 10)]
				: g === "team_id"
					? [row({ team_id: "t-research" }, 40)]
					: [row({}, 40)];
		return route.fulfill({ json: { from: "", to: "", rows } });
	});
	await page.route(/\/api\/usage\/timeseries/, (route) =>
		route.fulfill({ json: { from: "", to: "", interval: "1h", rows: [] } }),
	);
	return summaries;
}

test.describe("Usage explorer", () => {
	for (const lens of ["traffic", "spend", "tokens", "reliability", "latency"]) {
		test(`the ${lens} lens renders its table`, async ({ page }) => {
			await mockUsage(page);
			await page.goto(`/usage?lens=${lens}`);
			await expect(page.getByRole("heading", { name: "Breakdown" })).toBeVisible();
			await expect(page.getByRole("button", { name: "opus", exact: true })).toBeVisible();
		});
	}

	test("a picked filter reaches the server and shows as a chip", async ({
		page,
	}) => {
		const summaries = await mockUsage(page);
		await page.goto("/usage");
		await page.getByRole("button", { name: "Filter" }).click();
		await page.getByRole("button", { name: "Team" }).click();
		await page.getByText("t-research · 40").click();
		await page.keyboard.press("Escape");

		await expect(page).toHaveURL(/team_id=/);
		await expect(page.getByRole("button", { name: "Clear Team filter" })).toBeVisible();
		await expect
			.poll(() => summaries.some((q) => q.getAll("team_id").includes("t-research")))
			.toBe(true);
	});

	test("clicking a row narrows to it; lens and group-by live in the URL", async ({
		page,
	}) => {
		await mockUsage(page);
		await page.goto("/usage?lens=spend&group_by=model_id");
		await expect(page.getByRole("button", { name: "Spend", pressed: true })).toBeVisible();

		await page.getByRole("button", { name: "opus", exact: true }).click();
		await expect
			.poll(() => new URL(page.url()).searchParams.get("model_id"))
			.toContain("m-opus");
		await expect(page).toHaveURL(/lens=spend/);
		// Defaults stay out of the URL: no empty filter lists.
		expect(page.url()).not.toContain("host_id");
		await expect(page.getByRole("button", { name: "Clear Model filter" })).toBeVisible();
	});
});
