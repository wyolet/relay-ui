import { describe, expect, test } from "bun:test";
import {
	type BlendedPrice,
	blendedPrice,
	compareBlendedPrices,
	fmtBlendedPrice,
	lowestBlendedPrice,
} from "@/lib/usage-math/blendedPrice";
import type { RateLike } from "@/lib/usage-math/pricing";

const rate = (
	meter: string,
	amount: number,
	extra: Partial<RateLike> = {},
): RateLike => ({ meter, unit: "per_million", amount, ...extra });

const perM = (amount: number): BlendedPrice => ({
	amount,
	per: "1M",
	currency: "USD",
});

describe("blendedPrice", () => {
	test("weights input and output 3:1 per 1M tokens", () => {
		const p = blendedPrice(
			[rate("tokens.input", 3), rate("tokens.output", 15)],
			"USD",
		);
		expect(p).toEqual(perM(6));
	});

	test("cache and audio meters stay out of the blend", () => {
		const p = blendedPrice(
			[
				rate("tokens.input", 3),
				rate("tokens.output", 15),
				rate("tokens.cache_read", 0.3),
				rate("tokens.cache_creation", 3.75),
				rate("tokens.audio_input", 100),
			],
			"USD",
		);
		expect(p).toEqual(perM(6));
	});

	test("tiered rates blend at the base tier", () => {
		const p = blendedPrice(
			[
				rate("tokens.input", 6, { aboveTokens: 200_000 }),
				rate("tokens.input", 3),
				rate("tokens.output", 15),
				rate("tokens.output", 22.5, { aboveTokens: 200_000 }),
			],
			"USD",
		);
		expect(p).toEqual(perM(6));
	});

	test("service-tier rates never replace the base rate", () => {
		const p = blendedPrice(
			[
				rate("tokens.input", 1.5, { serviceTier: "flex" }),
				rate("tokens.input", 3),
				rate("tokens.output", 15),
			],
			"USD",
		);
		expect(p).toEqual(perM(6));
	});

	test("per-unit rates convert to per 1M", () => {
		const p = blendedPrice(
			[
				rate("tokens.input", 0.000003, { unit: "per_unit" }),
				rate("tokens.output", 15),
			],
			"USD",
		);
		expect(p?.amount).toBeCloseTo(6, 9);
	});

	test("a side without a rate drops out of the weights", () => {
		expect(blendedPrice([rate("tokens.input", 0.02)], "USD")).toEqual(
			perM(0.02),
		);
	});

	test("request-only sheets yield a per-request price", () => {
		const p = blendedPrice(
			[rate("requests", 0.02, { unit: "per_unit" })],
			"USD",
		);
		expect(p).toEqual({ amount: 0.02, per: "request", currency: "USD" });
	});

	test("token rates win over a request rate", () => {
		const p = blendedPrice(
			[rate("tokens.input", 2), rate("requests", 0.02, { unit: "per_unit" })],
			"USD",
		);
		expect(p).toEqual(perM(2));
	});

	test("no rates, or none that blend, is unpriced", () => {
		expect(blendedPrice([], "USD")).toBeNull();
		expect(blendedPrice([rate("tokens.cache_read", 0.3)], "USD")).toBeNull();
	});
});

describe("lowestBlendedPrice", () => {
	test("the cheapest host, with from when hosts differ", () => {
		expect(lowestBlendedPrice([perM(6), null, perM(4.5)])).toEqual({
			price: perM(4.5),
			from: true,
		});
	});

	test("no from when every priced host agrees", () => {
		expect(lowestBlendedPrice([perM(6), perM(6), null])).toEqual({
			price: perM(6),
			from: false,
		});
	});

	test("null when nothing is priced", () => {
		expect(lowestBlendedPrice([null, null])).toBeNull();
	});
});

describe("compareBlendedPrices", () => {
	test("token prices first, cheapest first, unpriced last", () => {
		const req: BlendedPrice = {
			amount: 0.001,
			per: "request",
			currency: "USD",
		};
		const sorted = [null, req, perM(9), perM(1)].sort(compareBlendedPrices);
		expect(sorted).toEqual([perM(1), perM(9), req, null]);
	});
});

describe("fmtBlendedPrice", () => {
	test("two decimals per 1M or per request", () => {
		expect(fmtBlendedPrice(perM(4.5))).toBe("$4.50 / 1M");
		expect(
			fmtBlendedPrice({ amount: 0.02, per: "request", currency: "USD" }),
		).toBe("$0.02 / req");
	});

	test("sub-cent prices read <$0.01, free reads $0.00", () => {
		expect(fmtBlendedPrice(perM(0.004))).toBe("<$0.01 / 1M");
		expect(fmtBlendedPrice(perM(0))).toBe("$0.00 / 1M");
	});

	test("non-USD currencies keep their code", () => {
		expect(fmtBlendedPrice({ amount: 2, per: "1M", currency: "EUR" })).toBe(
			"EUR 2.00 / 1M",
		);
	});
});
