import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const host = (id: string, name: string, displayName: string) => ({
	metadata: { id, name, displayName },
	spec: {},
});

const model = (
	id: string,
	displayName: string,
	spec: Record<string, unknown>,
) => ({
	metadata: { id, name: id, displayName },
	spec: { pointer: id, snapshots: null, ...spec },
});

const MODELS = [
	model("claude-opus-5", "Claude Opus 5", {
		family: "claude",
		productLine: "opus",
		releaseDate: "2026-09-10",
		contextWindowTotal: 200_000,
		capabilities: { tools: true, vision: true },
	}),
	model("claude-fable-1", "Claude Fable 1", {
		family: "claude",
		productLine: "fable",
		releaseDate: "2026-02-01",
		capabilities: { tools: true },
	}),
	model("claude-old", "Claude Old", {
		family: "claude",
		productLine: "opus",
		deprecation: { status: "deprecated" },
	}),
	model("gpt-6", "GPT 6", { family: "gpt", capabilities: { reasoning: true } }),
];

const BINDINGS: Record<string, string[]> = {
	"claude-opus-5": ["h-ant"],
	"claude-fable-1": ["h-ant"],
	"claude-old": ["h-ant"],
	"gpt-6": ["h-oai"],
};

/** Anthropic serves the Claude models (Opus priced), OpenAI serves GPT 6;
 * with `traffic`, Opus took requests on Anthropic last week. */
async function catalog(page: Page, traffic: boolean) {
	await mockApi(page, {
		...EMPTY_GRAPH,
		roles: ["admin"],
		hosts: [host("h-ant", "anthropic", "Anthropic"), host("h-oai", "openai", "OpenAI")],
		models: MODELS,
	});
	await page.route(/\/api\/catalog\/graph/, (route) =>
		route.fulfill({
			json: {
				hosts: [],
				providers: [],
				models: Object.entries(BINDINGS).map(([id, hosts]) => ({
					id,
					name: id,
					providerId: "p",
					bindings: hosts.map((hostId) => ({ hostId, adapter: "x" })),
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
							owner: { kind: "host", id: "h-ant" },
						},
						spec: {
							currency: "USD",
							enabled: true,
							targetModels: ["claude-opus-5"],
							rates: [
								{ meter: "tokens.input", unit: "per_million", amount: 4 },
								{ meter: "tokens.output", unit: "per_million", amount: 20 },
							],
						},
					},
				],
			},
		}),
	);
	await page.route(/\/api\/usage\/summary/, (route) => {
		const groupBy = new URL(route.request().url()).searchParams.get("group_by");
		const row = (key: string) => ({
			group: { [key]: key === "host_id" ? "h-ant" : "claude-opus-5" },
			requests: 9000,
			cost_nanos: 626e9,
			unpriced: 0,
		});
		return route.fulfill({
			json: {
				from: "",
				to: "",
				rows: traffic && groupBy ? [row(groupBy)] : [],
			},
		});
	});
}

const rail = (page: Page) => page.getByRole("navigation", { name: "Hosts" });

test.describe("Models", () => {
	test("opens In use by host when there was traffic", async ({ page }) => {
		await catalog(page, true);
		await page.goto("/models");
		await expect(page.getByRole("heading", { name: "In use" })).toBeVisible();
		await expect(rail(page).getByRole("link", { name: /In use\s*1/ })).toBeVisible();
		await expect(
			page.getByRole("heading", { level: 3, name: "Anthropic" }),
		).toBeVisible();
		await expect(page.getByRole("link", { name: "Claude Opus 5" })).toBeVisible();
		await expect(page.getByText("$626")).toHaveCount(2);
		await expect(page.getByRole("link", { name: "GPT 6" })).toHaveCount(0);
	});

	test("a host lists its models by family, priced or not", async ({ page }) => {
		await catalog(page, false);
		await page.goto("/models");
		// No traffic: the busiest-then-largest host opens.
		await expect(page.getByRole("heading", { name: "Anthropic" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "claude opus" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "claude fable" })).toBeVisible();
		await expect(page.getByText("$20.00")).toBeVisible();
		await expect(page.getByRole("link", { name: "Unpriced" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Claude Old" })).toHaveCount(0);

		await rail(page).getByRole("link", { name: /OpenAI/ }).click();
		await expect(page).toHaveURL(/host=openai/);
		await expect(page.getByRole("link", { name: "GPT 6" })).toBeVisible();
	});

	test("search and filters narrow the pane and the rail counts", async ({
		page,
	}) => {
		await catalog(page, false);
		await page.goto("/models?host=anthropic");
		await page.getByRole("searchbox", { name: "Search" }).fill("fable");
		await expect(page.getByRole("link", { name: "Claude Fable 1" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Claude Opus 5" })).toHaveCount(0);
		await expect(rail(page).getByRole("link", { name: /OpenAI\s*0/ })).toBeVisible();

		await page.getByRole("searchbox", { name: "Search" }).fill("");
		await page.getByRole("button", { name: "Filters" }).click();
		await page.getByRole("button", { name: "Vision" }).click();
		await expect(page).toHaveURL(/cap=vision/);
		await expect(page.getByRole("link", { name: "Claude Opus 5" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Claude Fable 1" })).toHaveCount(0);

		await page.getByRole("button", { name: "Show deprecated" }).click();
		await page.getByRole("button", { name: "Any" }).click();
		await expect(page.getByRole("link", { name: "Claude Old" })).toBeVisible();
	});

	test("a row opens its model and switches it off", async ({ page }) => {
		await catalog(page, false);
		const puts: { spec: { enabled?: boolean } }[] = [];
		await page.route("**/api/models/by-id/claude-opus-5", (route) => {
			if (route.request().method() !== "PUT") return route.fallback();
			const body = route.request().postDataJSON();
			puts.push(body);
			return route.fulfill({ json: body });
		});
		await page.goto("/models?host=anthropic");

		const row = page
			.getByRole("link", { name: "Claude Opus 5" })
			.locator("xpath=ancestor::div[contains(@class,'grid-cols')][1]");
		await row.getByRole("button", { name: "Row actions" }).click();
		await page.getByRole("menuitem", { name: "Disable" }).click();
		await expect.poll(() => puts.at(-1)?.spec.enabled).toBe(false);

		await page.getByRole("link", { name: "Claude Opus 5" }).click();
		await expect(page).toHaveURL(/\/models\/claude-opus-5(\?|$)/);
	});
});
