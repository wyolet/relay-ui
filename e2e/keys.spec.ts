import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const DAY = 24 * 60 * 60_000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

const key = (
	name: string,
	displayName: string,
	spec: Record<string, unknown>,
	createdAt: string,
) => ({
	metadata: { id: `k-${name}`, name, displayName, createdAt },
	spec: { keyHash: `hash-${name}`, prefix: `rk-${name.slice(0, 3)}`, ...spec },
});

const KEYS = [
	key(
		"claude-code",
		"Claude Code",
		{
			principal: { kind: "serviceaccount", id: "sa-1", name: "Builder" },
			accountId: "acc-1",
			passthroughAllowed: true,
			expiresAt: inDays(12),
		},
		"2026-01-10T00:00:00Z",
	),
	key(
		"old-key",
		"Old key",
		{
			principal: { kind: "user", id: "u-1", name: "alice" },
			enabled: false,
			expiresAt: inDays(-3),
		},
		"2026-06-01T00:00:00Z",
	),
	key(
		"fresh",
		"Fresh",
		{ principal: { kind: "user", id: "u-1", name: "alice" } },
		"2026-11-01T00:00:00Z",
	),
];

/** Fresh took most of last week's traffic, Claude Code a little. */
async function keysPage(page: Page) {
	await mockApi(page, {
		...EMPTY_GRAPH,
		roles: ["admin"],
		keys: KEYS,
		accounts: [
			{
				metadata: { id: "acc-1", name: "builder-lane", displayName: "Builder lane" },
				spec: { kind: "service" },
			},
		],
		policies: [
			{ metadata: { id: "pol-1", name: "standard", displayName: "Standard" }, spec: {} },
		],
		policyBindings: [
			{
				metadata: { id: "pb-1", name: "standard-binding" },
				spec: { policyId: "pol-1", accountIds: ["acc-1"], enabled: true },
			},
		],
	});
	await page.route(/\/api\/usage\/summary/, (route) => {
		const groupBy = new URL(route.request().url()).searchParams.get("group_by");
		const row = (hash: string, requests: number, cost: number) => ({
			group: { relay_key_hash: hash },
			requests,
			cost_nanos: cost,
			unpriced: 0,
		});
		return route.fulfill({
			json: {
				from: "",
				to: "",
				rows:
					groupBy === "relay_key_hash"
						? [row("hash-fresh", 9000, 626e9), row("hash-claude-code", 10, 2e9)]
						: [],
			},
		});
	});
}

const keyNames = (page: Page) =>
	page.getByRole("link", { name: /^(Claude Code|Old key|Fresh)$/ });

test.describe("API keys", () => {
	test("each fact gets its own column, usage first", async ({ page }) => {
		await keysPage(page);
		await page.goto("/keys");

		await expect(keyNames(page)).toHaveText(["Fresh", "Claude Code", "Old key"]);
		await expect(page.getByText("$626")).toBeVisible();
		await expect(page.getByText("Builder", { exact: true })).toBeVisible();
		await expect(page.getByRole("link", { name: "Builder lane" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Standard" })).toBeVisible();
		await expect(page.getByText("no policy")).toHaveCount(0);
		await expect(page.getByText("in 12 days")).toBeVisible();
		await expect(page.getByText("Expired", { exact: true })).toBeVisible();
		await expect(page.getByText("Never", { exact: true })).toBeVisible();
		await expect(
			page.getByRole("img", { name: "Passthrough allowed" }),
		).toHaveCount(1);
		await expect(
			page.getByRole("switch", { name: "Enable Old key" }),
		).not.toBeChecked();
	});

	test("the toolbar sorts by name and by expiry", async ({ page }) => {
		await keysPage(page);
		await page.goto("/keys");
		await expect(keyNames(page)).toHaveText(["Fresh", "Claude Code", "Old key"]);

		await page.getByRole("button", { name: "Sort" }).click();
		await page.getByRole("menuitem", { name: "Name" }).click();
		await expect(page).toHaveURL(/keys_by=name/);
		await expect(page).toHaveURL(/dir=asc/);
		await expect(keyNames(page)).toHaveText(["Claude Code", "Fresh", "Old key"]);

		await page.getByRole("button", { name: "Sort" }).click();
		await page.getByRole("menuitem", { name: "Expiring soonest" }).click();
		await expect(keyNames(page)).toHaveText(["Old key", "Claude Code", "Fresh"]);
	});

	for (const width of [1440, 1600]) {
		test(`no sideways scroll at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await keysPage(page);
			await page.goto("/keys");
			await expect(keyNames(page)).toHaveCount(3);
			// Any scroll container (the page, or the table's own) that scrolls sideways.
			const scrolling = await page.evaluate(() =>
				[document.documentElement, ...document.querySelectorAll("*")]
					.filter(
						(el) =>
							el === document.documentElement ||
							["auto", "scroll"].includes(getComputedStyle(el).overflowX),
					)
					.filter((el) => el.scrollWidth > el.clientWidth + 1)
					.map((el) => el.className.toString()),
			);
			expect(scrolling).toEqual([]);
		});
	}
});
