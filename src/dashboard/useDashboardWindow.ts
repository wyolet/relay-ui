import { useDeferredValue } from "react";
import { useCostSeries } from "@/api/hooks/cost";
import {
	type ResolvedWindow,
	resolveWindow,
	type StackedTimeline,
	useStackedSeries,
	useUsageNow,
} from "@/api/hooks/usage";
import {
	daySliceStarts,
	rollingWindow,
	totalsBySlice,
} from "@/lib/usage-math/window";
import type { SegmentedOption } from "@/shared/Segmented";
import {
	type DashboardMetric,
	type DashboardRange,
	useDashboardStore,
} from "@/stores/dashboard";

export const DASHBOARD_RANGES: SegmentedOption<DashboardRange>[] = [
	{ value: "7d", label: "Last 7 days" },
	{ value: "week", label: "This week" },
	{ value: "month", label: "This month" },
];

export const DASHBOARD_METRICS: SegmentedOption<DashboardMetric>[] = [
	{ value: "cost", label: "Spend" },
	{ value: "tokens", label: "Tokens" },
];

const RANGE_TEXT: Record<DashboardRange, { period: string; vs: string }> = {
	"7d": { period: "last 7 days", vs: "vs prior 7 days" },
	week: { period: "this week", vs: "vs last week" },
	month: { period: "this month", vs: "vs last month" },
};

export interface DashboardWindow {
	range: DashboardRange;
	/** "last 7 days", for section meta. */
	period: string;
	/** What deltas compare against, "vs prior 7 days". */
	vs: string;
	/** The period at the chart's bucket width. */
	win: ResolvedWindow;
	/** The period in hourly buckets, for heatmap and per-day trends. */
	hourly: ResolvedWindow;
	/** Trailing 7×24h, not calendar-aligned. */
	rolling: boolean;
	nowMs: number;
}

/** The dashboard's selected period. The trailing 7 days end now, so its
 * previous window is exactly a week earlier; calendar periods compare with
 * the last one up to the same point. */
export function useDashboardWindow(): DashboardWindow {
	// Deferred: switching periods keeps the current one on screen until the
	// new one loads, instead of every block falling back to a skeleton.
	const range = useDeferredValue(useDashboardStore((s) => s.range));
	const now = useUsageNow();
	const rolling = range === "7d";
	const win: ResolvedWindow = rolling
		? { ...rollingWindow(now, 7 * 24), interval: "1h" }
		: range === "week"
			? { ...resolveWindow("week"), interval: "1h" }
			: resolveWindow("month");
	return {
		range,
		...RANGE_TEXT[range],
		win,
		hourly: { ...win, interval: "1h" },
		rolling,
		nowMs: Date.parse(now),
	};
}

/** Spend or tokens by model over `win`; both read the same cached timeseries. */
export function useMetricSeries(
	metric: DashboardMetric,
	win: ResolvedWindow,
): StackedTimeline {
	const tokens = useStackedSeries("model_id", win, "tokens");
	const cost = useCostSeries("model_id", win);
	return metric === "cost" ? cost : tokens;
}

/** Sum of every series in each stacked point. */
export function pointTotals(data: {
	points: StackedTimeline["points"];
	series: string[];
}): { at: number; value: number }[] {
	return data.points.map((p) => ({
		at: Date.parse(p.bucket),
		value: data.series.reduce((sum, k) => sum + Number(p[k] ?? 0), 0),
	}));
}

/** Per-day totals across the period, oldest first; days not reached are null. */
export function dayTrend(
	dw: DashboardWindow,
	values: { at: number; value: number }[],
	combine?: (a: number, b: number) => number,
): (number | null)[] {
	return totalsBySlice(
		values,
		daySliceStarts(dw.hourly, dw.rolling),
		dw.nowMs,
		combine,
	);
}
