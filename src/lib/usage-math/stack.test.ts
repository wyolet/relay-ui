import { describe, expect, test } from "bun:test";
import {
	MAX_SERIES,
	OTHER_KEY,
	type SeriesSample,
	stackSamples,
} from "@/lib/usage-math/stack";

// UTC-midnight buckets, exactly as the relay emits them (epoch-aligned).
const day = (d: number) => new Date(Date.UTC(2026, 5, d)).toISOString();

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

	test("keeps server buckets when the window edges aren't bucket-aligned", () => {
		// Regression: a "week" window starts at *local* midnight (e.g. Sunday
		// 19:00Z for UTC+5), but the relay's 1d buckets start at UTC midnight.
		// The old local-calendar grid floored this sample off the grid and
		// silently dropped it.
		const from = "2026-06-30T19:00:00.000Z";
		const to = "2026-07-03T19:00:00.000Z";
		const samples: SeriesSample[] = [
			{ key: "a", bucket: "2026-07-01T00:00:00.000Z", value: 7 },
		];
		const { points } = stackSamples(samples, from, to, "1d");
		const total = points.reduce((acc, p) => acc + (Number(p.a) || 0), 0);
		expect(total).toBe(7);
		// Grid itself is epoch-aligned: every bucket sits on a UTC midnight.
		for (const p of points) {
			expect(Date.parse(String(p.bucket)) % 86_400_000).toBe(0);
		}
	});

	test("no samples → bare zero grid, no series", () => {
		const { points, series } = stackSamples([], day(1), day(2), "1d");
		expect(series).toEqual([]);
		expect(points).toHaveLength(2);
		expect(points[0]).toEqual({ bucket: day(1) });
	});
});
