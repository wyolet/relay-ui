import {
	stackedTimeseriesQueryOptions,
	usageComparisonWindows,
	usageSummaryQueryOptions,
	usageTotalsCompareQueryOptions,
	useUsageNow,
} from "@/api/hooks/usage";
import { pricingWindowAt } from "@/pricing/useHostModelUsage";

/** The model page's usage reads over the trailing week ending at `now`: the
 * loader prefetches these and the page's hooks read the same entries. */
export function modelWeekQueries(modelId: string, now: string) {
	const win = pricingWindowAt(now);
	const filter = { model_id: [modelId] };
	const { previous } = usageComparisonWindows(win, now);
	return {
		win,
		filter,
		totals: usageTotalsCompareQueryOptions(win, previous, filter),
		byHost: usageSummaryQueryOptions("host_id", win, filter),
		series: stackedTimeseriesQueryOptions("host_id", win, filter),
	};
}

export function useModelWeekQueries(modelId: string) {
	return modelWeekQueries(modelId, useUsageNow());
}
