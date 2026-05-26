import {
	type InfiniteData,
	infiniteQueryOptions,
	queryOptions,
	useSuspenseInfiniteQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";

// --- Schema-derived types ---

export type UsageEvent = components["schemas"]["Event"];
export type UsageEventsPage = components["schemas"]["usageEventsOutputBody"];
export type UsageSummaryResult = components["schemas"]["SummaryResult"];
export type UsageSummaryRow = components["schemas"]["SummaryRow"];
export type UsageTimeSeriesResult = components["schemas"]["TimeSeriesResult"];
export type UsageTimeSeriesRow = components["schemas"]["TimeSeriesRow"];
export type UsageTimeSeriesPoint = components["schemas"]["TimeSeriesPoint"];
export type UsageDurationStats = components["schemas"]["DurationStats"];

/**
 * Dimensions the relay can group usage by. Shared by /usage/summary and
 * /usage/timeseries (which both accept `group_by`). "source" is the default.
 */
export const USAGE_GROUP_BY = [
	"source",
	"model_id",
	"host_id",
	"policy_id",
	"relay_key_hash",
	"host_key_id",
] as const;
export type UsageGroupBy = (typeof USAGE_GROUP_BY)[number];

/** Bucket widths offered for the timeseries chart. */
export const USAGE_INTERVALS = ["5m", "1h", "1d"] as const;
export type UsageInterval = (typeof USAGE_INTERVALS)[number];

const EVENTS_PAGE_SIZE = 100;

// --- Query options ---

export function usageSummaryQueryOptions(groupBy: UsageGroupBy) {
	return queryOptions({
		queryKey: ["usage", "summary", groupBy] as const,
		queryFn: async (): Promise<UsageSummaryResult> => {
			const { data, error } = await apiClient.GET("/usage/summary", {
				params: { query: { group_by: groupBy } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 15_000,
		gcTime: 5 * 60_000,
	});
}

export function usageTimeseriesQueryOptions(
	interval: UsageInterval,
	groupBy: UsageGroupBy,
) {
	return queryOptions({
		queryKey: ["usage", "timeseries", interval, groupBy] as const,
		queryFn: async (): Promise<UsageTimeSeriesResult> => {
			const { data, error } = await apiClient.GET("/usage/timeseries", {
				params: { query: { interval, group_by: groupBy } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 15_000,
		gcTime: 5 * 60_000,
	});
}

export function usageEventsInfiniteQueryOptions() {
	return infiniteQueryOptions({
		queryKey: ["usage", "events"] as const,
		queryFn: async ({ pageParam }): Promise<UsageEventsPage> => {
			const { data, error } = await apiClient.GET("/usage/events", {
				params: {
					query: {
						limit: EVENTS_PAGE_SIZE,
						cursor: pageParam || undefined,
					},
				},
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		initialPageParam: "",
		getNextPageParam: (last) => last.next_cursor || undefined,
		staleTime: 15_000,
		gcTime: 5 * 60_000,
	});
}

// --- Hooks ---

export function useUsageSummary(groupBy: UsageGroupBy) {
	return useSuspenseQuery(usageSummaryQueryOptions(groupBy));
}

export function useUsageTimeseries(
	interval: UsageInterval,
	groupBy: UsageGroupBy,
) {
	return useSuspenseQuery(usageTimeseriesQueryOptions(interval, groupBy));
}

/**
 * Paginated raw events. Flattens the infinite-query pages into a single
 * `events` array so components render strings, not query plumbing.
 */
export function useUsageEvents() {
	const query = useSuspenseInfiniteQuery(usageEventsInfiniteQueryOptions());
	return {
		events: flattenEvents(query.data),
		fetchNextPage: query.fetchNextPage,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
	};
}

function flattenEvents(data: InfiniteData<UsageEventsPage>): UsageEvent[] {
	return data.pages.flatMap((page) => page.events ?? []);
}
