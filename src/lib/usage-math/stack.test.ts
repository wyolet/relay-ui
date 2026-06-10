import { describe, expect, test } from "bun:test";
import {
	MAX_SERIES,
	OTHER_KEY,
	type SeriesSample,
	stackSamples,
} from "@/lib/usage-math/stack";

// Local-time buckets so the grid aligns with floorToInterval's local calendar.
const day = (d: number) => new Date(2026, 5, d).toISOString();

describe("stackSamples", () => {
	test("zero-fills the full window and orders series by volume", () => {
		const samples: SeriesSample[] = [
			{ key: "a", bucket: day(1), value: 10 },
			{ key: "b", bucket: day(1), value: 30 },
			{ key: "a", bucket: day(3), value: 5 },
		];
		const { points, series } = stackSamples(samples, day(1), day(3), "1d");
		expect(series).toEqual(["b", "a"]);
		expect(points).toHaveLength(3);
		// Day 2 had no traffic but still exists, zeroed.
		expect(points[1]).toEqual({ bucket: day(2), b: 0, a: 0 });
		expect(points[2]?.a).toBe(5);
	});

	test("folds the small tail into OTHER_KEY", () => {
		const samples: SeriesSample[] = [
			{ key: "big", bucket: day(1), value: 990 },
			{ key: "tiny", bucket: day(1), value: 10 }, // 1% < 5% share
		];
		const { points, series } = stackSamples(samples, day(1), day(1), "1d");
		expect(series).toEqual(["big", OTHER_KEY]);
		expect(points[0]?.[OTHER_KEY]).toBe(10);
	});

	test("caps distinct series at MAX_SERIES", () => {
		const samples: SeriesSample[] = Array.from({ length: 10 }, (_, i) => ({
			key: `k${i}`,
			bucket: day(1),
			value: 100,
		}));
		const { series } = stackSamples(samples, day(1), day(1), "1d");
		expect(series).toHaveLength(MAX_SERIES + 1);
		expect(series[series.length - 1]).toBe(OTHER_KEY);
	});

	test("no samples → bare zero grid, no series", () => {
		const { points, series } = stackSamples([], day(1), day(2), "1d");
		expect(series).toEqual([]);
		expect(points).toHaveLength(2);
		expect(points[0]).toEqual({ bucket: day(1) });
	});
});
