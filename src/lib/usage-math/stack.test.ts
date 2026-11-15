import { describe, expect, test } from "bun:test";
import {
	MAX_SERIES,
	niceCeil,
	OTHER_KEY,
	outlierCap,
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

describe("outlierCap", () => {
	const point = (bucket: string, a: number) => ({ bucket, a });

	test("caps the axis under a runaway column and names it", () => {
		const points = [
			...Array.from({ length: 20 }, (_, i) => point(`b${i}`, 10)),
			point("spike", 5000),
		];
		const spike = { bucket: "spike", total: 5000 };
		expect(outlierCap(points, ["a"])).toEqual({
			max: 20,
			clipped: [spike],
			labelled: [{ ...spike, anchor: "end" }],
		});
	});

	test("tops the axis just above the tallest ordinary column", () => {
		const points = [
			...Array.from({ length: 40 }, (_, i) => point(`b${i}`, 1 + i * 1.5)),
			point("tall", 82),
			point("x", 198),
			point("y", 183),
		];
		expect(outlierCap(points, ["a"])?.max).toBe(100);
	});

	test("clips every outlier and labels the ones far apart", () => {
		const points = [
			...Array.from({ length: 20 }, (_, i) => point(`a${i}`, 10)),
			point("p1", 900),
			point("p2", 700),
			...Array.from({ length: 20 }, (_, i) => point(`c${i}`, 10)),
			point("p3", 800),
		];
		const cap = outlierCap(points, ["a"]);
		expect(cap?.clipped.map((c) => c.bucket)).toEqual(["p1", "p3", "p2"]);
		expect(cap?.labelled.map((c) => [c.bucket, c.anchor])).toEqual([
			["p1", "middle"],
			["p3", "end"],
		]);
	});

	test("draws to full scale when more than three columns would clip", () => {
		const points = [
			...Array.from({ length: 80 }, (_, i) => point(`b${i}`, 10)),
			...["p1", "p2", "p3", "p4"].map((b) => point(b, 900)),
		];
		expect(outlierCap(points, ["a"])).toBeNull();
		expect(outlierCap(points.slice(0, 83), ["a"])?.clipped).toHaveLength(3);
	});

	test("leaves an even series alone", () => {
		const points = Array.from({ length: 20 }, (_, i) => point(`b${i}`, 10 + i));
		expect(outlierCap(points, ["a"])).toBeNull();
	});
});

test("niceCeil rounds up to 1, 2, 2.5 or 5 times a power of ten", () => {
	expect([0.7, 15, 127.5, 240, 3100].map(niceCeil)).toEqual([
		1, 20, 200, 250, 5000,
	]);
});
