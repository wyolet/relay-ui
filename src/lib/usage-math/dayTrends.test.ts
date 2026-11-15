import { describe, expect, test } from "bun:test";
import { dayTrends } from "@/lib/usage-math/dayTrends";

const DAY = 86_400_000;
const from = Date.UTC(2026, 10, 1, 9);
const win = {
	from: new Date(from).toISOString(),
	to: new Date(from + 3 * DAY).toISOString(),
};
const point = (at: number, requests: number, errors = 0, usd = 0) => ({
	bucket: new Date(at).toISOString(),
	requests,
	error_count: errors,
	cost_nanos: usd * 1e9,
});

describe("dayTrends", () => {
	test("sums every series into each day of the window", () => {
		const trends = dayTrends(
			[
				{ points: [point(from, 10, 1, 2), point(from + DAY + 5, 4)] },
				{ points: [point(from + 3_600_000, 10, 1, 3)] },
			],
			win,
			from + 3 * DAY,
		);
		expect(trends.requests).toEqual([20, 4, 0]);
		expect(trends.spend).toEqual([5, 0, 0]);
		expect(trends.errorRate).toEqual([0.1, 0, 0]);
	});

	test("leaves days not reached yet as null", () => {
		const trends = dayTrends([{ points: null }], win, from + DAY);
		expect(trends.requests).toEqual([0, 0, null]);
		expect(trends.errorRate).toEqual([0, 0, null]);
	});
});
