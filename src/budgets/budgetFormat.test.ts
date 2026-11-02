import { describe, expect, test } from "bun:test";
import { AMOUNT_USD_PATTERN, amountInput } from "@/budgets/budgetFormat";

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
