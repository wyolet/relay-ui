import {
	type ResolvedWindow,
	resolveWindow,
	useStackedSeries,
} from "@/api/hooks/usage";
import type { HeatRow } from "@/shared/HourHeatmap";
import { fmtCompact, fmtInt } from "@/usage/format";

const HOURS = 24;
const LEVELS = 5;

/** This week in hourly buckets: the dashboard chart and heatmap share it. */
export function weekByHour(): ResolvedWindow {
	return { ...resolveWindow("week"), interval: "1h" };
}

function localMidnight(ms: number): number {
	const d = new Date(ms);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

/** Each day's total this week, Monday first; days not yet reached are null. */
export function dailyTotals(
	points: { bucket: string; [series: string]: number | string }[],
	series: string[],
): (number | null)[] {
	const start = localMidnight(Date.parse(resolveWindow("week").from));
	const today = localMidnight(Date.now());
	const totals = Array.from({ length: 7 }, (_, i): number | null => {
		const d = new Date(start);
		d.setDate(d.getDate() + i);
		return d.getTime() > today ? null : 0;
	});
	for (const p of points) {
		const at = Date.parse(p.bucket);
		const i = Math.round((localMidnight(at) - start) / 86_400_000);
		const prev = totals[i];
		if (prev === null || prev === undefined) continue;
		totals[i] = prev + series.reduce((sum, k) => sum + Number(p[k] ?? 0), 0);
	}
	return totals;
}

/** Requests per hour of each day this week, on a five-step ramp. */
export function useWeekActivity(): { rows: HeatRow[]; hours: string[] } {
	const { points, series } = useStackedSeries(
		"model_id",
		weekByHour(),
		"requests",
	);
	const start = localMidnight(Date.parse(resolveWindow("week").from));

	const days = Array.from({ length: 7 }, (_, i) => {
		const d = new Date(start);
		d.setDate(d.getDate() + i);
		return { midnight: d.getTime(), counts: new Array<number>(HOURS).fill(0) };
	});
	for (const p of points) {
		const at = Date.parse(p.bucket);
		const day = days.find((d) => d.midnight === localMidnight(at));
		if (!day) continue;
		const count = series.reduce((sum, k) => sum + Number(p[k] ?? 0), 0);
		day.counts[new Date(at).getHours()] += count;
	}

	const max = Math.max(1, ...days.flatMap((d) => d.counts));
	const rows = days.map((d) => {
		const date = new Date(d.midnight);
		const day = `${date.toLocaleDateString(undefined, { weekday: "short" })} ${date.getDate()}`;
		return {
			key: String(d.midnight),
			day,
			cells: d.counts.map((n, h) => ({
				key: String(h),
				level: n === 0 ? 0 : Math.max(1, Math.ceil((n / max) * LEVELS)),
				title: `${day} · ${String(h).padStart(2, "0")}:00 · ${fmtInt(n)} requests`,
			})),
			total: fmtCompact(d.counts.reduce((a, b) => a + b, 0)),
		};
	});
	const hours = Array.from({ length: HOURS }, (_, h) =>
		h % 3 === 0 ? String(h).padStart(2, "0") : "",
	);
	return { rows, hours };
}
