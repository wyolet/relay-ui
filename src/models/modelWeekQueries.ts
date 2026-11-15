import { usageSummaryQueryOptions, useUsageNow } from "@/api/hooks/usage";
import {
	type WeekUsageScope,
	weekUsageQueries,
} from "@/usage/weekUsageQueries";

/** The model's week of usage, its traffic split by host. */
export function modelWeekScope(modelId: string): WeekUsageScope {
	return { filter: { model_id: [modelId] }, splitBy: "host_id" };
}

/** The model page's usage reads over the trailing week ending at `now`: the
 * loader prefetches these and the page's hooks read the same entries. */
export function modelWeekQueries(modelId: string, now: string) {
	const week = weekUsageQueries(modelWeekScope(modelId), now);
	return {
		...week,
		byHost: usageSummaryQueryOptions("host_id", week.win, week.filter),
	};
}

export function useModelWeekQueries(modelId: string) {
	return modelWeekQueries(modelId, useUsageNow());
}
