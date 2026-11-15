import { recentLogsQueryOptions } from "@/api/hooks/logs";
import { usageSummaryQueryOptions, useUsageNow } from "@/api/hooks/usage";
import {
	type WeekUsageScope,
	weekUsageQueries,
} from "@/usage/weekUsageQueries";

/** Rows the recent-requests list shows. */
const RECENT_REQUESTS = 10;

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
		recent: recentLogsQueryOptions(
			{ model_id: [modelId], since: "7d" },
			RECENT_REQUESTS,
		),
	};
}

export function useModelWeekQueries(modelId: string) {
	return modelWeekQueries(modelId, useUsageNow());
}
