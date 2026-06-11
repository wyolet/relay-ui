import { describe, expect, test } from "bun:test";
import { costTotal, NANOS_PER_USD, sumCostRows } from "@/lib/usage-math/cost";

describe("costTotal", () => {
	test("converts nano-USD and reports the unpriced share", () => {
		const t = costTotal(3_500_000_000, 2, 10);
		expect(t.usd).toBeCloseTo(3.5, 9);
		expect(t.unpricedEvents).toBe(2);
		expect(t.unpricedShare).toBeCloseTo(0.2, 9);
	});

	test("all-unpriced traffic is null, never $0", () => {
		const t = costTotal(0, 5, 5);
		expect(t.usd).toBeNull();
		expect(t.unpricedShare).toBe(1);
	});

	test("a true $0 over priced events stays $0", () => {
		// Priced meters, zero counts — the relay stamps CostNanos = 0.
		expect(costTotal(0, 0, 3).usd).toBe(0);
	});

	test("no traffic at all is null", () => {
		const t = costTotal(0, 0, 0);
		expect(t.usd).toBeNull();
		expect(t.unpricedShare).toBe(0);
	});
});

describe("sumCostRows", () => {
	test("folds rows; priced anywhere → a number", () => {
		const t = sumCostRows([
			{ cost_nanos: NANOS_PER_USD, unpriced: 0, requests: 4 },
			{ cost_nanos: 0, unpriced: 3, requests: 3 },
		]);
		expect(t.usd).toBeCloseTo(1, 9);
		expect(t.unpricedEvents).toBe(3);
		expect(t.unpricedShare).toBeCloseTo(3 / 7, 9);
	});

	test("empty rows → null", () => {
		expect(sumCostRows([]).usd).toBeNull();
	});
});
