/**
 * Pure window math for period-over-period comparisons. No fetching, no React —
 * hooks resolve "now" and feed it in, components only render the results.
 */

/** An absolute ISO-8601 `[from, to)` window. */
export interface IsoWindow {
	from: string;
	to: string;
}

/** Bucket widths the relay's /usage/timeseries endpoint accepts. */
export const USAGE_INTERVALS = ["5m", "1h", "1d"] as const;
export type UsageInterval = (typeof USAGE_INTERVALS)[number];

/** Bucket width in milliseconds, matching the relay's epoch-aligned buckets. */
export const INTERVAL_MS: Record<UsageInterval, number> = {
	"5m": 5 * 60_000,
	"1h": 3_600_000,
	"1d": 86_400_000,
};

/**
 * Floor a timestamp to the start of its bucket. Buckets align to the Unix
 * epoch — the relay's Bucketize computes bucketStart = floor(unix/interval),
 * so daily buckets start at UTC midnight. Flooring to *local* calendar units
 * here would shift each sample onto the wrong bar (or off the grid entirely)
 * for any non-UTC viewer.
 */
export function floorToInterval(ms: number, interval: UsageInterval): number {
	const step = INTERVAL_MS[interval];
	return Math.floor(ms / step) * step;
}

/** Advance a timestamp by one bucket. */
export function advanceInterval(ms: number, interval: UsageInterval): number {
	return ms + INTERVAL_MS[interval];
}

export interface ComparisonWindows {
	current: IsoWindow;
	previous: IsoWindow;
}

/**
 * Derive the comparison window for `win`: the immediately preceding period of
 * equal length, truncated to the same *elapsed* portion. Calendar presets give
 * `to` in the future (end of week/month), so comparing against the full prior
 * period would understate every partial period — Wednesday-of-this-week is
 * compared against Monday→Wednesday of last week, not all seven days.
 */
/**
 * The trailing `[now − hours, now)` window. Callers pass a quantized "now" so
 * the resulting window (and any query key built from it) stays byte-stable
 * across renders.
 */
export function rollingWindow(nowIso: string, hours: number): IsoWindow {
	const nowMs = Date.parse(nowIso);
	if (!Number.isFinite(nowMs) || !(hours > 0)) {
		return { from: nowIso, to: nowIso };
	}
	return {
		from: new Date(nowMs - hours * 60 * 60 * 1000).toISOString(),
		to: new Date(nowMs).toISOString(),
	};
}

export function comparisonWindows(
	win: IsoWindow,
	nowIso: string,
): ComparisonWindows {
	const fromMs = Date.parse(win.from);
	const toMs = Date.parse(win.to);
	const nowMs = Date.parse(nowIso);
	if (
		!Number.isFinite(fromMs) ||
		!Number.isFinite(toMs) ||
		!Number.isFinite(nowMs)
	) {
		// Unusable input: empty previous window, so deltas degrade to "no baseline".
		return { current: win, previous: { from: win.from, to: win.from } };
	}

	const span = Math.max(toMs - fromMs, 0);
	const elapsed = Math.min(Math.max(Math.min(nowMs, toMs) - fromMs, 0), span);
	const prevFrom = fromMs - span;
	return {
		current: win,
		previous: {
			from: new Date(prevFrom).toISOString(),
			to: new Date(prevFrom + elapsed).toISOString(),
		},
	};
}
