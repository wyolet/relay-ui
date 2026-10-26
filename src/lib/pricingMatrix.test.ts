import { describe, expect, test } from "bun:test";
import {
	buildPricingMatrix,
	filterPricingMatrix,
	type MatrixPricing,
	pricingCoverage,
	rankPriceRows,
	usageByModel,
} from "@/lib/pricingMatrix";

const hosts = [
	{ id: "h-ant", slug: "anthropic", label: "Anthropic" },
	{ id: "h-az", slug: "azure", label: "Azure" },
	{ id: "h-idle", slug: "idle", label: "Idle" },
];
const models = [
	{ id: "m-opus", slug: "opus", label: "claude-opus" },
	{ id: "m-haiku", slug: "haiku", label: "claude-haiku" },
	{ id: "m-gpt", slug: "gpt", label: "gpt-4o" },
];
const bindings = [
	{ hostId: "h-ant", modelId: "m-opus" },
	{ hostId: "h-ant", modelId: "m-haiku" },
	{ hostId: "h-az", modelId: "m-gpt" },
];

function sheet(p: Partial<MatrixPricing>): MatrixPricing {
	return {
		name: "std",
		label: "Standard",
		hostId: "h-ant",
		enabled: true,
		currency: "USD",
		targetModels: [],
		rates: [],
		...p,
	};
}

describe("buildPricingMatrix", () => {
	const matrix = buildPricingMatrix({
		hosts,
		models,
		bindings,
		pricings: [
			sheet({
				targetModels: ["m-opus"],
				rates: [
					{ meter: "tokens.input", unit: "per_million", amount: 15 },
					{
						meter: "tokens.input",
						unit: "per_million",
						amount: 30,
						aboveTokens: 200_000,
					},
					{ meter: "tokens.output", unit: "per_million", amount: 75 },
					{ meter: "tokens.reasoning", unit: "per_million", amount: 75 },
				],
			}),
			sheet({
				name: "az-off",
				label: "Azure (off)",
				hostId: "h-az",
				enabled: false,
				targetModels: ["m-gpt", "m-opus"],
			}),
		],
	});

	test("one section per host that serves or prices something, by label", () => {
		expect(matrix.map((h) => h.host.slug)).toEqual(["anthropic", "azure"]);
	});

	test("rows carry base rates, a tier marker and the other meters' count", () => {
		const opus = matrix[0]?.rows.find((r) => r.model.slug === "opus");
		expect(opus?.cells["tokens.input"]).toEqual({
			amount: 15,
			unit: "per_million",
			tiered: true,
		});
		expect(opus?.cells["tokens.output"]?.tiered).toBe(false);
		expect(opus?.extra).toBe(1);
		expect(opus?.unpriced).toBe(false);
	});

	test("a served model no sheet prices is unpriced", () => {
		const haiku = matrix[0]?.rows.find((r) => r.model.slug === "haiku");
		expect(haiku?.unpriced).toBe(true);
		expect(haiku?.sheet).toBeUndefined();
		expect(matrix[0]?.unpriced).toBe(1);
	});

	test("a disabled sheet prices nothing but stays named", () => {
		const gpt = matrix[1]?.rows.find((r) => r.model.slug === "gpt");
		expect(gpt?.unpriced).toBe(true);
		expect(gpt?.sheet).toEqual({
			name: "az-off",
			label: "Azure (off)",
			enabled: false,
		});
		expect(gpt?.cells).toEqual({});
	});

	test("a sheet target the host doesn't serve shows, not as unpriced", () => {
		const stray = matrix[1]?.rows.find((r) => r.model.slug === "opus");
		expect(stray?.served).toBe(false);
		expect(stray?.unpriced).toBe(false);
	});

	test("coverage counts served bindings only", () => {
		expect(pricingCoverage(matrix)).toEqual({ served: 3, priced: 1 });
	});

	test("filters by text and by unpriced", () => {
		expect(
			filterPricingMatrix(matrix, "haiku", false).flatMap((h) =>
				h.rows.map((r) => r.model.slug),
			),
		).toEqual(["haiku"]);
		expect(
			filterPricingMatrix(matrix, "azure", false)[0]?.rows.map(
				(r) => r.model.slug,
			),
		).toEqual(["opus", "gpt"]);
		expect(
			filterPricingMatrix(matrix, "", true).flatMap((h) =>
				h.rows.map((r) => r.model.slug),
			),
		).toEqual(["haiku", "gpt"]);
	});
});

describe("rankPriceRows", () => {
	const row = (id: string, unpriced: boolean) => ({
		model: { id, slug: id, label: id },
		currency: "USD",
		cells: {},
		extra: 0,
		served: true,
		unpriced,
	});
	const usage = usageByModel([
		{ group: { model_id: "b" }, requests: 50, cost_nanos: 2e9, unpriced: 0 },
		{ group: { model_id: "c" }, requests: 10, cost_nanos: 0, unpriced: 10 },
	]);

	test("reads usage per model, null spend when nothing was priced", () => {
		expect(usage.get("b")).toEqual({ requests: 50, usd: 2 });
		expect(usage.get("c")).toEqual({ requests: 10, usd: null });
	});

	test("unpriced first, then busiest, then by name", () => {
		const ranked = rankPriceRows(
			[row("a", false), row("b", false), row("c", true), row("d", false)],
			usage,
		);
		expect(ranked.map((r) => r.model.id)).toEqual(["c", "b", "a", "d"]);
	});
});
