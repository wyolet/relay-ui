import {
	stackedTimeseriesQueryOptions,
	type UsageGroupBy,
	type UsageSummaryFilter,
	usageComparisonWindows,
	usageTotalsCompareQueryOptions,
	useUsageNow,
} from "@/api/hooks/usage";
import { pricingWindowAt } from "@/pricing/useHostModelUsage";

/** One resource's slice of usage; non-null so /logs takes it as search too. */
export type UsageResourceFilter = Partial<
	Record<
		keyof Pick<
			UsageSummaryFilter,
			"model_id" | "host_id" | "policy_id" | "relay_key_hash"
		>,
		string[]
	>
>;

/** Whose week of usage to read, and the dimension its chart splits by. */
export interface WeekUsageScope {
	filter: UsageResourceFilter;
	splitBy: UsageGroupBy;
}

/** A resource's usage reads over the trailing week ending at `now`: loaders
 * prefetch these and the figures and traffic hooks read the same entries. */
export function weekUsageQueries(scope: WeekUsageScope, now: string) {
	const win = pricingWindowAt(now);
	const { previous } = usageComparisonWindows(win, now);
	return {
		win,
		filter: scope.filter,
		totals: usageTotalsCompareQueryOptions(win, previous, scope.filter),
		series: stackedTimeseriesQueryOptions(scope.splitBy, win, scope.filter),
	};
}

export function useWeekUsageQueries(scope: WeekUsageScope) {
	return weekUsageQueries(scope, useUsageNow());
}
