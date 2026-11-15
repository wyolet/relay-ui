import { describe, expect, test } from "bun:test";
import {
	AMOUNT_USD_PATTERN,
	amountInput,
	capText,
} from "@/budgets/budgetFormat";
import { fmtUsd } from "@/lib/limitsFormat";

describe("AMOUNT_USD_PATTERN", () => {
	test("accepts whole dollars and up to two cents digits", () => {
		for (const ok of ["0", "2000", "49.5", "49.50"]) {
			expect(AMOUNT_USD_PATTERN.test(ok)).toBe(true);
		}
	});

	test("refuses a third fractional digit and malformed input", () => {
		for (const bad of ["", "1.234", ".5", "5.", "1,000", "-1", "1e3"]) {
			expect(AMOUNT_USD_PATTERN.test(bad)).toBe(false);
		}
	});
});

test("amountInput drops currency symbols and separators", () => {
	expect(amountInput("$2,000.50")).toBe("2000.50");
	expect(amountInput(" 12a")).toBe("12");
});

describe("capText", () => {
	test("reads as the amount per period, a month when unset", () => {
		expect(capText({ amountUsd: "150", period: "day" }, fmtUsd)).toBe(
			"$150 per day",
		);
		expect(capText({ amountUsd: "49.50" }, fmtUsd)).toBe("$49.50 per month");
	});
});
