import { NANOS_PER_USD } from "./cost";
import { daySliceStarts, type IsoWindow, totalsBySlice } from "./window";

/** The fields a day trend reads off a /usage/timeseries point. */
export interface TrendBucket {
	bucket: string;
	requests: number;
	error_count: number;
	cost_nanos: number;
}

/** One value per day-long slice of a window, oldest first; null for a day
 * not reached yet. */
export interface DayTrends {
	requests: (number | null)[];
	/** USD; unpriced traffic adds nothing. */
	spend: (number | null)[];
	/** Failed share of the day's requests; 0 on a day without any. */
	errorRate: (number | null)[];
}

/** Requests, spend and error rate per day of a trailing window, summed
 * across every series of a timeseries. */
export function dayTrends(
	series: readonly { points?: readonly TrendBucket[] | null }[],
	win: IsoWindow,
	nowMs: number,
): DayTrends {
	const starts = daySliceStarts(win, true);
	const points = series.flatMap((s) => s.points ?? []);
	const perDay = (value: (p: TrendBucket) => number) =>
		totalsBySlice(
			points.map((p) => ({ at: Date.parse(p.bucket), value: value(p) })),
			starts,
			nowMs,
		);
	const requests = perDay((p) => p.requests);
	const errors = perDay((p) => p.error_count);
	return {
		requests,
		spend: perDay((p) => p.cost_nanos / NANOS_PER_USD),
		errorRate: requests.map((r, i) => {
			if (r === null) return null;
			return r > 0 ? (errors[i] ?? 0) / r : 0;
		}),
	};
}
