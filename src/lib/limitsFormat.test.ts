import { describe, expect, test } from "bun:test";
import {
	fmtBudgetUsage,
	fmtRuleUsage,
	fmtUsd,
	meterShare,
} from "@/lib/limitsFormat";

describe("fmtUsd", () => {
	test("whole dollars drop the cents", () => {
		expect(fmtUsd("50")).toBe("$50");
		expect(fmtUsd("2000")).toBe("$2,000");
	});
	test("fractions show two cents digits", () => {
		expect(fmtUsd("12.4")).toBe("$12.40");
		expect(fmtUsd("0.123456")).toBe("$0.12");
	});
	test("sub-cent spend reads as under a cent, zero as $0", () => {
		expect(fmtUsd("0.0042")).toBe("<$0.01");
		expect(fmtUsd("0")).toBe("$0");
	});
	test("unparseable input passes through", () => {
		expect(fmtUsd("")).toBe("");
		expect(fmtUsd("n/a")).toBe("n/a");
	});
});

describe("meterShare", () => {
	test("is used over cap, clamped to 0..1", () => {
		expect(meterShare(25, 100)).toBe(0.25);
		expect(meterShare(150, 100)).toBe(1);
		expect(meterShare(-5, 100)).toBe(0);
	});
	test("a zero cap is full", () => {
		expect(meterShare(0, 0)).toBe(1);
	});
	test("non-finite input is empty", () => {
		expect(meterShare(Number.NaN, 100)).toBe(0);
	});
});

describe("usage text", () => {
	test("rules use compact counts", () => {
		expect(fmtRuleUsage(420, 1000)).toBe("420 / 1k");
		expect(fmtRuleUsage(1_500_000, 2_000_000)).toBe("1.5M / 2M");
	});
	test("budgets use USD", () => {
		expect(fmtBudgetUsage("12.4", "50")).toBe("$12.40 / $50");
	});
});
