import { describe, expect, test } from "bun:test";
import { draftFromNanos, nanosFromDraft } from "@/lib/durationNanos";
import { tokenLifetimeErrors } from "@/lib/tokenLifetimes";

const HOUR = 3_600_000_000_000;

describe("draftFromNanos", () => {
	test("picks the largest unit that holds the duration whole", () => {
		expect(draftFromNanos(HOUR)).toEqual({ amount: 1, unit: "h" });
		expect(draftFromNanos(24 * HOUR)).toEqual({ amount: 1, unit: "d" });
		expect(draftFromNanos(36 * HOUR)).toEqual({ amount: 36, unit: "h" });
		expect(draftFromNanos(HOUR / 4)).toEqual({ amount: 15, unit: "m" });
	});

	test("falls back to fractional minutes", () => {
		expect(draftFromNanos(90_000_000_000)).toEqual({ amount: 1.5, unit: "m" });
		expect(draftFromNanos(0)).toEqual({ amount: 0, unit: "m" });
	});
});

describe("nanosFromDraft", () => {
	test("round-trips through a draft", () => {
		for (const n of [HOUR, 24 * HOUR, 36 * HOUR, HOUR / 4]) {
			expect(nanosFromDraft(draftFromNanos(n))).toBe(n);
		}
	});
});

describe("tokenLifetimeErrors", () => {
	test("accepts a default within the maximum", () => {
		expect(
			tokenLifetimeErrors({ amount: 1, unit: "h" }, { amount: 1, unit: "d" }),
		).toEqual({});
	});

	test("refuses zero lifetimes", () => {
		expect(
			tokenLifetimeErrors({ amount: 0, unit: "h" }, { amount: 0, unit: "d" }),
		).toEqual({
			defaultTTL: "Must be longer than zero.",
			maxTTL: "Must be longer than zero.",
		});
	});

	test("refuses a default longer than the maximum", () => {
		expect(
			tokenLifetimeErrors({ amount: 2, unit: "d" }, { amount: 24, unit: "h" }),
		).toEqual({ defaultTTL: "Can't be longer than the maximum lifetime." });
	});
});
