/**
 * Pure window math for period-over-period comparisons. No fetching, no React —
 * hooks resolve "now" and feed it in, components only render the results.
 */

/** An absolute ISO-8601 `[from, to)` window. */
export interface IsoWindow {
	from: string;
	to: string;
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
