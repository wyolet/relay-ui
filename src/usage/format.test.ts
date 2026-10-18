import { describe, expect, it } from "bun:test";
import {
	fmtCompact,
	fmtMoneyCompact,
	fmtMs,
	fmtPct,
	sumTokens,
} from "@/usage/format";

describe("fmtPct", () => {
	it("renders integer percents without decimals", () => {
		expect(fmtPct(0)).toBe("0%");
		expect(fmtPct(0.5)).toBe("50%");
		expect(fmtPct(1)).toBe("100%");
	});

	it("keeps one decimal below 10% but drops it at/above 10%", () => {
		// tolerant of locale decimal separator
		expect(fmtPct(0.012)).toMatch(/^1[.,]2%$/);
		expect(fmtPct(0.123)).toBe("12%");
	});
});

describe("fmtCompact", () => {
	it("passes small counts through", () => {
		expect(fmtCompact(0)).toBe("0");
		expect(fmtCompact(999)).toBe("999");
	});

	it("suffixes thousands and millions", () => {
		expect(fmtCompact(2000)).toBe("2K");
		expect(fmtCompact(1_000_000)).toBe("1M");
		expect(fmtCompact(4_100_000)).toMatch(/^4[.,]1M$/);
	});
});

describe("fmtMs", () => {
	it("rounds to whole milliseconds under a second", () => {
		expect(fmtMs(0)).toBe("0 ms");
		expect(fmtMs(123.6)).toBe("124 ms");
	});

	it("switches to seconds at/above 1000ms", () => {
		expect(fmtMs(1000)).toMatch(/^1 s$/);
		expect(fmtMs(1500)).toMatch(/^1[.,]5 s$/);
	});
});

describe("sumTokens", () => {
	it("sums all token buckets", () => {
		expect(sumTokens({ prompt: 10, completion: 5, reasoning: 2 })).toBe(17);
	});

	it("treats missing/empty maps as zero", () => {
		expect(sumTokens(undefined)).toBe(0);
		expect(sumTokens({})).toBe(0);
	});
});

describe("fmtMoneyCompact", () => {
	it("never shows more than cents", () => {
		expect(fmtMoneyCompact(0.2531, "USD")).toMatch(/0[.,]25$/);
		expect(fmtMoneyCompact(148, "USD")).toMatch(/148$/);
	});

	it("floors sub-cent amounts to <$0.01", () => {
		expect(fmtMoneyCompact(0.0042, "USD")).toMatch(/^<.*0[.,]01$/);
		expect(fmtMoneyCompact(0, "USD")).toMatch(/\$0$/);
	});
});
