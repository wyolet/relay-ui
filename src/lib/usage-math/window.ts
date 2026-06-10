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

/** Floor a timestamp to the start of its local bucket (5m / hour / day). */
export function floorToInterval(ms: number, interval: UsageInterval): number {
	const d = new Date(ms);
	if (interval === "1d") {
		d.setHours(0, 0, 0, 0);
	} else if (interval === "1h") {
		d.setMinutes(0, 0, 0);
	} else {
		d.setSeconds(0, 0);
		d.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
	}
	return d.getTime();
}

/** Advance a timestamp by one local bucket (DST-safe via Date mutators). */
export function advanceInterval(ms: number, interval: UsageInterval): number {
	const d = new Date(ms);
	if (interval === "1d") d.setDate(d.getDate() + 1);
	else if (interval === "1h") d.setHours(d.getHours() + 1);
	else d.setMinutes(d.getMinutes() + 5);
	return d.getTime();
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
