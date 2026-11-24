import { describe, expect, it } from "bun:test";
import {
	easyRateLimitRules,
	parseAmount,
	validAmount,
} from "@/rate-limits/easyRateLimit";

describe("easyRateLimitRules", () => {
	it("makes one sliding-window rule per meter, requests first, window in seconds", () => {
		expect(
			easyRateLimitRules({
				tokens: { amount: 100000, per: "hour" },
				requests: { amount: 60, per: "minute" },
			}),
		).toEqual([
			{ amount: 60, meter: "requests", strategy: "sliding-window", window: 60 },
			{
				amount: 100000,
				meter: "tokens",
				strategy: "sliding-window",
				window: 3600,
			},
		]);
	});

	it("makes none for no answers", () => {
		expect(easyRateLimitRules({})).toEqual([]);
	});

	it("counts a day as 86400 seconds", () => {
		expect(
			easyRateLimitRules({ requests: { amount: 5, per: "day" } })[0]?.window,
		).toBe(86400);
	});
});

describe("parseAmount", () => {
	it("reads grouped digits", () => {
		expect(parseAmount("1,000")).toBe(1000);
		expect(parseAmount("1 000")).toBe(1000);
	});

	it("accepts only whole numbers of 1 or more", () => {
		expect(validAmount(parseAmount("0"))).toBe(false);
		expect(validAmount(parseAmount(""))).toBe(false);
		expect(validAmount(parseAmount("abc"))).toBe(false);
		expect(validAmount(parseAmount("3"))).toBe(true);
	});
});
