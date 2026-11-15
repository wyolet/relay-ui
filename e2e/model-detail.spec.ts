import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const MODEL = {
	metadata: { id: "claude-opus-5", name: "claude-opus-5", displayName: "Claude Opus 5" },
	spec: {
		pointer: "claude-opus-5",
		snapshots: null,
		family: "claude",
		productLine: "opus",
		releaseDate: "2026-09-10",
		contextWindowTotal: 200_000,
		capabilities: { tools: true, vision: true },
	},
};

const hostRef = (id: string, name: string, displayName: string) => ({
	id,
	name,
	displayName,
	enabled: true,
});

const HOUR = 3_600_000;
const duration = (p95: number) => ({ avg: p95 / 2, max: p95, p50: p95 / 3, p95, p99: p95 });

/** Opus runs on Anthropic (priced) and OpenAI (no sheet) and took 8.7K
 * requests in the last 7 days, most on Anthropic. */
async function modelPage(page: Page) {
	await mockApi(page, {
		...EMPTY_GRAPH,
		roles: ["admin"],
		hosts: [
			{ metadata: { id: "h-ant", name: "anthropic", displayName: "Anthropic" }, spec: {} },
			{ metadata: { id: "h-oai", name: "openai", displayName: "OpenAI" }, spec: {} },
		],
		models: [MODEL],
	});
	await page.route("**/api/models/claude-opus-5/hosts", (route) =>
		route.fulfill({
			json: {
				hosts: [
					{
						host: hostRef("h-ant", "anthropic", "Anthropic"),
						binding: { id: "b-ant", adapter: "anthropic", enabled: true },
						pricing: null,
					},
					{
						host: hostRef("h-oai", "openai", "OpenAI"),
						binding: { id: "b-oai", adapter: "openai", enabled: true },
						pricing: null,
					},
				],
			},
		}),
	);
	await page.route("**/api/models/claude-opus-5/policies", (route) =>
		route.fulfill({
			json: {
				policies: [
					{
						id: "pol-1",
						name: "team-default",
						owner: { kind: "user" },
						limits: [
							{ amount: 1000, meter: "requests", window: "1m0s", strategy: "sliding" },
						],
					},
				],
			},
		}),
	);
	await page.route(/\/api\/catalog\/graph/, (route) =>
		route.fulfill({
			json: {
				hosts: [],
				providers: [],
				models: [
					{
						id: "claude-opus-5",
						name: "claude-opus-5",
						providerId: "p",
						bindings: [
							{ hostId: "h-ant", adapter: "anthropic" },
							{ hostId: "h-oai", adapter: "openai" },
						],
					},
				],
			},
		}),
	);
	await page.route(/\/api\/pricings(\?.*)?$/, (route) =>
		route.fulfill({
			json: {
				total: 1,
				items: [
					{
						metadata: { id: "pr-1", name: "opus-list", owner: { kind: "host", id: "h-ant" } },
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
	const usage = (requests: number, usd: number, unpriced = 0) => ({
		requests,
		error_count: Math.round(requests * 0.002),
		errors_4xx: 0,
		errors_5xx: 0,
		throttled: 0,
		cost_nanos: usd * 1e9,
		unpriced,
		tokens: {},
		duration_ms: duration(18_200),
	});
	await page.route(/\/api\/usage\/summary/, (route) => {
		const groupBy = new URL(route.request().url()).searchParams.get("group_by");
		const rows =
			groupBy === "host_id"
				? [
						{ group: { host_id: "h-ant" }, ...usage(8000, 613) },
						{ group: { host_id: "h-oai" }, ...usage(700, 0, 700) },
					]
				: [{ group: {}, ...usage(8700, 613, 700) }];
		return route.fulfill({ json: { from: "", to: "", rows } });
	});
	await page.route(/\/api\/usage\/timeseries/, (route) => {
		const hour = Math.floor(Date.now() / HOUR) * HOUR;
		const point = (hoursAgo: number, requests: number) => ({
			bucket: new Date(hour - hoursAgo * HOUR).toISOString(),
			...usage(requests, requests * 0.07),
		});
		return route.fulfill({
			json: {
				from: "0001-01-01T00:00:00Z",
				to: "0001-01-01T00:00:00Z",
				interval: "1h",
				labels: { "h-ant": "anthropic" },
				rows: [{ group: { host_id: "h-ant" }, points: [point(30, 5000), point(2, 3700)] }],
			},
		});
	});
	await page.route(/\/api\/logs(\?.*)?$/, (route) =>
		route.fulfill({
			json: {
				logs: [
					{
						request_id: "req-1",
						ts: new Date().toISOString(),
						status: 200,
						duration_ms: 1200,
						source: "pipeline",
						model_id: "claude-opus-5",
						host_id: "h-ant",
						tokens: { "tokens.input": 100 },
					},
				],
			},
		}),
	);
	await page.goto("/models/claude-opus-5");
}

test.describe("Model detail", () => {
	test("one page: the week's figures, where it runs, who can use it", async ({
		page,
	}) => {
		await modelPage(page);
		await expect(page.getByRole("heading", { level: 1, name: /Claude Opus 5/ })).toBeVisible();
		await expect(page.getByRole("tab")).toHaveCount(0);

		// The week's figure; the Anthropic host row repeats it as its spend.
		await expect(page.getByText("$613", { exact: true }).first()).toBeVisible();
		await expect(page.getByText("8.7K", { exact: true })).toBeVisible();
		await expect(page.getByText("18.2 s", { exact: true })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Traffic by host" })).toBeVisible();

		const hosts = page.getByRole("list").filter({ has: page.getByRole("link", { name: "Anthropic" }) });
		await expect(hosts.getByText("$4.00")).toBeVisible();
		await expect(hosts.getByRole("term").filter({ hasText: "Spend" })).toBeVisible();
		await expect(hosts.getByRole("link", { name: "Rate sheet →" })).toHaveAttribute(
			"href",
			/\/pricing\/opus-list$/,
		);
		await expect(
			hosts.getByRole("link", { name: "Unpriced. Add a price →" }),
		).toHaveAttribute("href", /\/pricing\/new\?.*host=h-oai/);

		await expect(page.getByRole("link", { name: "team-default" })).toBeVisible();
		await expect(page.getByText("1k requests / 1m")).toBeVisible();
		await expect(page.getByText("200k tokens")).toBeVisible();
		await expect(page.getByText("Tool use")).toBeVisible();

		// Request rows live only on the Logs page.
		await expect(page.getByRole("heading", { name: "Recent requests" })).toHaveCount(0);
	});
});
