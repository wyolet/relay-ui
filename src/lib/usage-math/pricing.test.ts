import { describe, expect, test } from "bun:test";
import {
	type BindingPricing,
	blendedRequestCost,
	type CostCellInput,
	type CostSeriesRow,
	costPerTokenByMeter,
	deriveCostStacked,
	estimatedSpend,
	groupByMeter,
	joinCostGrid,
	type PricingLookup,
	type RateLike,
	spendByMeter,
	summarizeCost,
	summarizeRatesParts,
	tokenKeyForMeter,
	unitTokens,
} from "@/lib/usage-math/pricing";
import { OTHER_KEY } from "@/lib/usage-math/stack";

const rate = (
	meter: string,
	amount: number,
	unit = "per_million",
	aboveTokens?: number,
): RateLike => ({ meter, unit, amount, aboveTokens });

describe("unitTokens", () => {
	test("mirrors the relay's closed unit enum", () => {
		expect(unitTokens("per_million")).toBe(1_000_000);
		expect(unitTokens("per_unit")).toBe(1);
	});

	test("unknown units are unpriceable (null), never guessed", () => {
		expect(unitTokens("1M_tokens")).toBeNull();
		expect(unitTokens("")).toBeNull();
	});
});

describe("tokenKeyForMeter", () => {
	test("strips the tokens. prefix (inverse of MeterForUsageKey)", () => {
		expect(tokenKeyForMeter("tokens.input")).toBe("input");
		expect(tokenKeyForMeter("tokens.cache_creation")).toBe("cache_creation");
		expect(tokenKeyForMeter("tokens.server_tool_use_input")).toBe(
			"server_tool_use_input",
		);
	});

	test("unknown meters pass through", () => {
		expect(tokenKeyForMeter("images")).toBe("images");
	});
});

describe("groupByMeter", () => {
	test("preserves first-seen meter order, sorts tiers ascending with base first", () => {
		const groups = groupByMeter([
			rate("tokens.output", 15),
			rate("tokens.input", 2, "per_million", 200_000),
			rate("tokens.input", 3),
		]);
		expect(groups.map((g) => g.meter)).toEqual([
			"tokens.output",
			"tokens.input",
		]);
		const input = groups[1];
		expect(input?.rates.map((r) => r.aboveTokens ?? 0)).toEqual([0, 200_000]);
		expect(input?.rates[0]?.amount).toBe(3);
	});

	test("empty input → empty output", () => {
		expect(groupByMeter([])).toEqual([]);
	});
});

describe("costPerTokenByMeter / blendedRequestCost", () => {
	test("uses base rate per meter, scaled by unit", () => {
		const cpt = costPerTokenByMeter([
			rate("tokens.input", 3),
			rate("tokens.input", 2, "per_million", 200_000),
			rate("tokens.output", 0.015, "per_unit"),
		]);
		expect(cpt.get("tokens.input")).toBeCloseTo(3 / 1e6, 12);
		expect(cpt.get("tokens.output")).toBeCloseTo(0.015, 12);
	});

	test("meters with unknown units are skipped, not mispriced", () => {
		const cpt = costPerTokenByMeter([rate("tokens.input", 3, "1M_tokens")]);
		expect(cpt.size).toBe(0);
	});

	test("blended cost is null without an input rate", () => {
		expect(blendedRequestCost([rate("tokens.output", 15)])).toBeNull();
	});

	test("output falls back to the input rate", () => {
		// 800 in + 200 out at $3/1M each.
		expect(blendedRequestCost([rate("tokens.input", 3)])).toBeCloseTo(
			(1000 * 3) / 1e6,
			12,
		);
	});

	test("800/200 blend with distinct rates", () => {
		const cost = blendedRequestCost([
			rate("tokens.input", 3),
			rate("tokens.output", 15),
		]);
		expect(cost).toBeCloseTo((800 * 3) / 1e6 + (200 * 15) / 1e6, 12);
	});
});

describe("estimatedSpend / spendByMeter", () => {
	const rates = [
		rate("tokens.input", 3),
		rate("tokens.output", 15),
		rate("tokens.cache_read", 0.3),
	];

	test("maps tokens.* meters to bare usage token keys", () => {
		const spend = estimatedSpend(rates, {
			input: 1_000_000,
			output: 100_000,
		});
		expect(spend).toBeCloseTo(3 + 1.5, 9);
	});

	test("cache meters bill against their bare keys", () => {
		const spend = estimatedSpend(rates, { cache_read: 2_000_000 });
		expect(spend).toBeCloseTo(0.6, 9);
	});

	test("unpriced token keys contribute nothing", () => {
		expect(estimatedSpend(rates, { reasoning: 5e6 })).toBe(0);
	});

	test("empty tokens → 0", () => {
		expect(estimatedSpend(rates, {})).toBe(0);
	});

	test("spendByMeter parts sum to estimatedSpend", () => {
		const tokens = { input: 5e6, output: 1e6, cache_read: 2e6 };
		const parts = spendByMeter(rates, tokens);
		let sum = 0;
		for (const v of parts.values()) sum += v;
		expect(sum).toBeCloseTo(estimatedSpend(rates, tokens), 9);
		expect(parts.get("tokens.input")).toBeCloseTo(15, 9);
		expect(parts.get("tokens.output")).toBeCloseTo(15, 9);
	});
});

describe("summarizeCost", () => {
	test("single currency", () => {
		const sum = summarizeCost(new Map([["USD", 12.5]]));
		expect(sum.dominant).toEqual({ currency: "USD", amount: 12.5 });
		expect(sum.mixed).toBe(false);
	});

	test("mixed currencies: dominant is the larger, never summed", () => {
		const sum = summarizeCost(
			new Map([
				["EUR", 5],
				["USD", 9],
			]),
			123,
		);
		expect(sum.dominant).toEqual({ currency: "USD", amount: 9 });
		expect(sum.totals.map((t) => t.currency)).toEqual(["USD", "EUR"]);
		expect(sum.mixed).toBe(true);
		expect(sum.unpricedTokens).toBe(123);
	});

	test("empty → no dominant", () => {
		const sum = summarizeCost(new Map());
		expect(sum.dominant).toBeNull();
		expect(sum.mixed).toBe(false);
	});
});

const lookup = (
	entries: Array<[host: string, model: string, pricing: BindingPricing]>,
): PricingLookup => {
	const out = new Map<string, Map<string, BindingPricing>>();
	for (const [host, model, pricing] of entries) {
		const inner = out.get(host) ?? new Map<string, BindingPricing>();
		inner.set(model, pricing);
		out.set(host, inner);
	}
	return out;
};

describe("joinCostGrid", () => {
	const usd: BindingPricing = {
		currency: "USD",
		rates: [rate("tokens.input", 3), rate("tokens.output", 15)],
	};
	const eur: BindingPricing = {
		currency: "EUR",
		rates: [rate("tokens.input", 2)],
	};

	const cells: CostCellInput[] = [
		{ hostId: "h1", modelId: "m1", requests: 10, tokens: { input: 1e6 } },
		{ hostId: "h2", modelId: "m1", requests: 5, tokens: { input: 2e6 } },
		{ hostId: "h1", modelId: "m2", requests: 7, tokens: { input: 4e6 } },
	];

	test("priced + unpriced cells, per-currency roll-ups", () => {
		const grid = joinCostGrid(
			cells,
			lookup([
				["h1", "m1", usd],
				["h2", "m1", eur],
				// h1/m2 deliberately unpriced
			]),
		);
		// h1/m1: 1M input @ $3/1M = $3; h2/m1: 2M @ €2/1M = €4.
		expect(grid.total.totals).toEqual([
			{ currency: "EUR", amount: 4 },
			{ currency: "USD", amount: 3 },
		]);
		expect(grid.total.mixed).toBe(true);
		expect(grid.total.unpricedTokens).toBe(4e6);

		const m1 = grid.byModel.get("m1");
		expect(m1?.mixed).toBe(true);
		expect(m1?.unpricedTokens).toBe(0);

		// h1 saw $3 priced (m1) plus m2's unpriced 4M tokens; h2 is pure EUR.
		expect(grid.byHost.get("h1")?.dominant).toEqual({
			currency: "USD",
			amount: 3,
		});
		expect(grid.byHost.get("h1")?.unpricedTokens).toBe(4e6);
		expect(grid.byHost.get("h2")?.dominant).toEqual({
			currency: "EUR",
			amount: 4,
		});

		// Unpriced usage is reported, never $0.
		const m2 = grid.byModel.get("m2");
		expect(m2?.dominant).toBeNull();
		expect(m2?.unpricedTokens).toBe(4e6);
		expect(grid.unpriced).toEqual({
			tokens: 4e6,
			requests: 7,
			modelIds: ["m2"],
		});
		const unpricedCell = grid.cells.find((c) => c.modelId === "m2");
		expect(unpricedCell?.cost).toBeNull();
		expect(unpricedCell?.currency).toBeNull();
	});

	test("pricing with zero rates counts as unpriced", () => {
		const grid = joinCostGrid(
			[{ hostId: "h1", modelId: "m1", requests: 1, tokens: { input: 100 } }],
			lookup([["h1", "m1", { currency: "USD", rates: [] }]]),
		);
		expect(grid.total.dominant).toBeNull();
		expect(grid.unpriced.modelIds).toEqual(["m1"]);
	});
});

describe("deriveCostStacked", () => {
	const usd: BindingPricing = {
		currency: "USD",
		rates: [rate("tokens.input", 3)],
	};
	// Two daily buckets, local time.
	const d1 = new Date(2026, 5, 1).toISOString();
	const d2 = new Date(2026, 5, 2).toISOString();
	const from = d1;
	const to = new Date(2026, 5, 2, 12).toISOString();

	test("stacks per-bucket spend by model, excludes unpriced rows", () => {
		const rows: CostSeriesRow[] = [
			{
				hostId: "h1",
				modelId: "m1",
				points: [
					{ bucket: d1, tokens: { input: 1e6 } },
					{ bucket: d2, tokens: { input: 2e6 } },
				],
			},
			{
				hostId: "h1",
				modelId: "m2",
				points: [{ bucket: d1, tokens: { input: 5e6 } }],
			},
		];
		const stacked = deriveCostStacked(
			rows,
			lookup([["h1", "m1", usd]]),
			"model_id",
			from,
			to,
			"1d",
		);
		expect(stacked.series).toEqual(["m1"]);
		expect(stacked.points).toHaveLength(2);
		expect(stacked.points[0]?.m1).toBeCloseTo(3, 9);
		expect(stacked.points[1]?.m1).toBeCloseTo(6, 9);
		expect(stacked.currency).toBe("USD");
		expect(stacked.mixed).toBe(false);
		expect(stacked.unpriced).toEqual({ tokens: 5e6, modelIds: ["m2"] });
		expect(stacked.series).not.toContain(OTHER_KEY);
	});

	test("host dimension sums models per host", () => {
		const rows: CostSeriesRow[] = [
			{
				hostId: "h1",
				modelId: "m1",
				points: [{ bucket: d1, tokens: { input: 1e6 } }],
			},
			{
				hostId: "h1",
				modelId: "m2",
				points: [{ bucket: d1, tokens: { input: 1e6 } }],
			},
		];
		const stacked = deriveCostStacked(
			rows,
			lookup([
				["h1", "m1", usd],
				["h1", "m2", usd],
			]),
			"host_id",
			from,
			to,
			"1d",
		);
		expect(stacked.series).toEqual(["h1"]);
		expect(stacked.points[0]?.h1).toBeCloseTo(6, 9);
	});
});

describe("summarizeRatesParts", () => {
	test("base rate per meter, canonical meter order, tier counts", () => {
		const parts = summarizeRatesParts([
			rate("tokens.cache_read", 0.3),
			rate("tokens.input", 2, "per_million", 200_000),
			rate("tokens.input", 3),
			rate("tokens.output", 15),
		]);
		expect(parts.map((p) => p.meter)).toEqual([
			"tokens.input",
			"tokens.output",
			"tokens.cache_read",
		]);
		expect(parts[0]).toEqual({
			meter: "tokens.input",
			amount: 3,
			unit: "per_million",
			tiers: 1,
		});
		expect(parts[1]?.tiers).toBe(0);
	});
});
