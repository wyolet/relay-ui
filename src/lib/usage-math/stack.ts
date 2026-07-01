/**
 * Generic stacked-series shaping shared by the usage and cost charts: rank
 * series by total volume, fold the long tail into "Others", and zero-fill an
 * epoch-aligned bucket grid over the whole window. Callers flatten their
 * rows into (key, bucket, value) samples; this module owns the rest.
 */

import { advanceInterval, floorToInterval, type UsageInterval } from "./window";

/** Series with less than this share of total volume fold into "Others". */
export const OTHER_SHARE = 0.05;
/** Hard cap on distinct series before the rest fold into "Others". */
export const MAX_SERIES = 6;
export const OTHER_KEY = "__other";

/** One stacked bucket: epoch label plus a value per series key. */
export type StackedPoint = { bucket: string } & Record<string, number | string>;

/** One series' contribution to one time bucket. */
export interface SeriesSample {
	key: string;
	bucket: string;
	value: number;
}

export interface StackedSeries {
	points: StackedPoint[];
	/** Ordered series keys present in the data (largest first, OTHER_KEY last). */
	series: string[];
}

export function stackSamples(
	samples: readonly SeriesSample[],
	from: string,
	to: string,
	interval: UsageInterval,
): StackedSeries {
	// Total per series across the window → decide who survives vs folds to Others.
	const totals = new Map<string, number>();
	let grand = 0;
	for (const s of samples) {
		totals.set(s.key, (totals.get(s.key) ?? 0) + s.value);
		grand += s.value;
	}

	const ranked = [...totals.entries()].sort(([, a], [, b]) => b - a);
	const keep = new Set<string>();
	for (const [key, total] of ranked) {
		if (keep.size >= MAX_SERIES) break;
		if (grand > 0 && total / grand < OTHER_SHARE) break;
		keep.add(key);
	}
	const hasOther = keep.size < totals.size;

	// Zero-filled bucket grid over the FULL window, epoch-aligned so it matches
	// the relay's bucket boundaries exactly (same alignment deriveTimeline
	// uses). Empty buckets render as gaps instead of collapsing the axis to
	// only the buckets that had traffic.
	const toMs = Date.parse(to);
	const byEpoch = new Map<number, StackedPoint>();
	const points: StackedPoint[] = [];
	let t = floorToInterval(Date.parse(from), interval);
	for (let guard = 0; t <= toMs && guard < 5000; guard++) {
		const seed: StackedPoint = { bucket: new Date(t).toISOString() };
		for (const k of keep) seed[k] = 0;
		if (hasOther) seed[OTHER_KEY] = 0;
		byEpoch.set(t, seed);
		points.push(seed);
		t = advanceInterval(t, interval);
	}

	for (const s of samples) {
		const key = keep.has(s.key) ? s.key : OTHER_KEY;
		const epoch = floorToInterval(Date.parse(s.bucket), interval);
		const bucket = byEpoch.get(epoch);
		if (!bucket) continue;
		bucket[key] = (Number(bucket[key]) || 0) + s.value;
	}

	const series = ranked.filter(([k]) => keep.has(k)).map(([k]) => k);
	if (hasOther) series.push(OTHER_KEY);
	return { points, series };
}
