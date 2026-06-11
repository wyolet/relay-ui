import { describe, expect, test } from "bun:test";
import {
	blendedRequestCost,
	costPerTokenByMeter,
	estimatedSpend,
	groupByMeter,
	type RateLike,
	spendByMeter,
	summarizeRatesParts,
	tokenKeyForMeter,
	unitTokens,
} from "@/lib/usage-math/pricing";

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
