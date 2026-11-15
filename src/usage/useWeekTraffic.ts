import { useCostSeries } from "@/api/hooks/cost";
import {
	type StackedTimeline,
	useHasTraffic,
	useStackedSeries,
} from "@/api/hooks/usage";
import type { SegmentedOption } from "@/shared/Segmented";
import { dimensionLabel } from "@/usage/format";
import {
	useWeekUsageQueries,
	type WeekUsageScope,
} from "@/usage/weekUsageQueries";

export type WeekTrafficMetric = "requests" | "cost";

export const WEEK_TRAFFIC_METRICS: SegmentedOption<WeekTrafficMetric>[] = [
	{ value: "requests", label: "Requests" },
	{ value: "cost", label: "Spend" },
];

/** The chart's heading, e.g. "Traffic by host". */
export function weekTrafficTitle(scope: WeekUsageScope): string {
	return `Traffic by ${dimensionLabel(scope.splitBy).toLowerCase()}`;
}

/** A resource's last 7 days split by `scope.splitBy`, as requests or spend;
 * both read the one timeseries the figures' trends come from. */
export function useWeekTraffic(
	scope: WeekUsageScope,
	metric: WeekTrafficMetric,
): { hasTraffic: boolean; data: StackedTimeline } {
	const { win, filter } = useWeekUsageQueries(scope);
	const hasTraffic = useHasTraffic(win, filter);
	const requests = useStackedSeries(scope.splitBy, win, "requests", filter);
	const cost = useCostSeries(scope.splitBy, win, filter);
	return { hasTraffic, data: metric === "cost" ? cost : requests };
}
