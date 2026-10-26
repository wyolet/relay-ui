import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const md = (id: string, name: string, displayName: string) => ({
	metadata: { id, name, displayName },
	spec: {},
});

/** Anthropic serves opus (priced), haiku (no sheet) and `more` extra models. */
async function catalog(page: Page, more = 0) {
	const extra = Array.from({ length: more }, (_, i) => `m-extra-${i}`);
	await mockApi(page, {
		...EMPTY_GRAPH,
		roles: ["admin"],
		hosts: [md("h-ant", "anthropic", "Anthropic")],
		models: [
			md("m-opus", "claude-opus", "Claude Opus"),
			md("m-haiku", "claude-haiku", "Claude Haiku"),
			...extra.map((id) => md(id, id, id)),
		],
	});
	await page.route(/\/api\/catalog\/graph/, (route) =>
		route.fulfill({
			json: {
				hosts: [],
				providers: [],
				models: ["m-opus", "m-haiku", ...extra].map((id) => ({
					id,
					name: id,
					providerId: "p",
					bindings: [{ hostId: "h-ant", adapter: "anthropic" }],
				})),
			},
		}),
	);
	await page.route(/\/api\/pricings(\?.*)?$/, (route) =>
		route.fulfill({
			json: {
				total: 1,
				items: [
					{
						metadata: {
							id: "p1",
							name: "opus-list",
							displayName: "Opus list",
							owner: { kind: "host", id: "h-ant" },
						},
						spec: {
							currency: "USD",
							enabled: true,
							targetModels: ["m-opus"],
							rates: [
								{ meter: "tokens.input", unit: "per_million", amount: 15 },
								{ meter: "tokens.output", unit: "per_million", amount: 75 },
							],
						},
					},
				],
			},
		}),
	);
}

test.describe("Pricing", () => {
	test("rates sit under their host, unpriced models offer a sheet", async ({
		page,
	}) => {
		await catalog(page);
		await page.goto("/pricing");
		await expect(page.getByRole("heading", { name: "Anthropic" })).toBeVisible();
		await expect(page.getByText("1 unpriced")).toBeVisible();
		await expect(page.getByText("$75.00")).toBeVisible();

		await page.getByRole("link", { name: "Add pricing →" }).click();
		await expect(page).toHaveURL(/\/pricing\/new\?host=h-ant&model=m-haiku$/);
		await expect(page.getByRole("button", { name: /Claude Haiku/ })).toBeVisible();
	});

	test("unpriced only narrows to the rows missing a sheet", async ({ page }) => {
		await catalog(page);
		await page.goto("/pricing?unpriced=true");
		await expect(page.getByRole("link", { name: "Claude Haiku" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Claude Opus" })).toHaveCount(0);
	});

	test("a host past five models folds the rest behind show all", async ({
		page,
	}) => {
		await catalog(page, 6);
		await page.goto("/pricing");
		const rows = page.getByRole("link", { name: /^(Claude|m-extra)/ });
		await expect(rows).toHaveCount(5);
		await page.getByRole("button", { name: "Show all 8 models" }).click();
		await expect(rows).toHaveCount(8);
	});
});
