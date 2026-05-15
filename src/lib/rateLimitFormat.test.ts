import { describe, expect, it } from "bun:test";
import type { components } from "@/api/types.gen";
import { secToNs } from "@/lib/timeWindow";
import {
	compactNumber,
	formatRuleShort,
	formatRulesShort,
} from "./rateLimitFormat";

type Rule = components["schemas"]["RateLimitRule"];

const r = (
	amount: number,
	meter: Rule["meter"],
	windowSec: number,
	strategy: Rule["strategy"] = "token-bucket",
): Rule => ({ amount, meter, strategy, window: secToNs(windowSec) });

describe("compactNumber", () => {
	it("leaves sub-thousand untouched", () => {
		expect(compactNumber(0)).toBe("0");
		expect(compactNumber(1)).toBe("1");
		expect(compactNumber(999)).toBe("999");
	});

	it("uses k, M, B", () => {
		expect(compactNumber(1000)).toBe("1k");
		expect(compactNumber(10_000)).toBe("10k");
		expect(compactNumber(1_000_000)).toBe("1M");
		expect(compactNumber(2_500_000_000)).toBe("2.5B");
	});

	it("uses one decimal when rounding would lose >5%", () => {
		expect(compactNumber(1500)).toBe("1.5k");
		expect(compactNumber(1200)).toBe("1.2k");
	});

	it("rounds when integer is accurate enough", () => {
		expect(compactNumber(99_500)).toBe("100k"); // ≥100 → no decimals
		expect(compactNumber(150_000)).toBe("150k");
	});
});

describe("formatRuleShort", () => {
	it("renders RPM/TPM/CPM for canonical windows", () => {
		expect(formatRuleShort(r(1000, "requests", 60))).toBe("1k RPM");
		expect(formatRuleShort(r(10_000, "tokens", 60))).toBe("10k TPM");
		expect(formatRuleShort(r(5, "concurrency", 1))).toBe("5 CPS");
	});

	it("uses Tin/Tout for sub-token meters", () => {
		expect(formatRuleShort(r(1000, "tokens.input", 60))).toBe("1k TinPM");
		expect(formatRuleShort(r(500, "tokens.output", 3600))).toBe("500 ToutPH");
	});

	it("falls back to /Ns for custom windows", () => {
		expect(formatRuleShort(r(100, "requests", 30))).toBe("100 R/30s");
	});
});

describe("formatRulesShort", () => {
	it("joins rules with ·", () => {
		expect(
			formatRulesShort([r(1000, "requests", 60), r(10_000, "tokens", 60)]),
		).toBe("1k RPM · 10k TPM");
	});

	it("handles null/empty", () => {
		expect(formatRulesShort(null)).toBe("no rules");
		expect(formatRulesShort([])).toBe("no rules");
	});
});
