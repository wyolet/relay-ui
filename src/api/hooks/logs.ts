import {
	type InfiniteData,
	infiniteQueryOptions,
	queryOptions,
	useQuery,
	useSuspenseInfiniteQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components, operations } from "@/api/types.gen";

// --- Schema-derived types ---

/** A logged request — the same Event shape as /usage/events. */
export type LogEvent = components["schemas"]["Event"];
export type LogListPage = components["schemas"]["logsListOutputBody"];
/** Full capture: the event plus (when opted in) request/response bodies. */
export type LogDetail = components["schemas"]["logGetOutputBody"];
export type LogPayload = components["schemas"]["logPayload"];

/** Server-side filters accepted by GET /logs (minus pagination, which we own). */
export type LogsFilter = Omit<
	NonNullable<operations["logs_list"]["parameters"]["query"]>,
	"limit" | "cursor"
>;

const LIST_PAGE_SIZE = 100;

export function logsInfiniteQueryOptions(filter: LogsFilter = {}) {
	return infiniteQueryOptions({
		queryKey: ["logs", "list", filter] as const,
		queryFn: async ({ pageParam }): Promise<LogListPage> => {
			const { data, error } = await apiClient.GET("/logs", {
				params: {
					query: {
						...filter,
						limit: LIST_PAGE_SIZE,
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

// --- Histogram (filter-scoped volume over the window, via /usage/timeseries) ---

/** One time bucket of request volume for the logs histogram. */
export interface LogHistogramPoint {
	bucket: string;
	requests: number;
	errors: number;
}

/** Bucket width to use for a given relative window. */
function intervalForSince(since: string | undefined): "5m" | "1h" | "1d" {
	if (since === "24h") return "1h";
	if (since === "7d" || since === "30d") return "1d";
	return "5m"; // 1h / 6h
}

/**
 * Request volume over the window for the histogram, scoped by the same
 * dimension filters as the feed. Status filters aren't supported by the
 * timeseries endpoint, so the histogram reflects window + dimensions only.
 */
export function logsHistogramQueryOptions(filter: LogsFilter) {
	return queryOptions({
		queryKey: ["logs", "histogram", filter] as const,
		queryFn: async (): Promise<LogHistogramPoint[]> => {
			const { data, error } = await apiClient.GET("/usage/timeseries", {
				params: {
					query: {
						interval: intervalForSince(filter.since),
						group_by: "source",
						since: filter.since,
						model_id: filter.model_id,
						host_id: filter.host_id,
						policy_id: filter.policy_id,
					},
				},
			});
			if (error) throw new ApiError(0, error.error);
			const byBucket = new Map<string, LogHistogramPoint>();
			for (const series of data.rows ?? []) {
				for (const p of series.points ?? []) {
					const cur = byBucket.get(p.bucket) ?? {
						bucket: p.bucket,
						requests: 0,
						errors: 0,
					};
					cur.requests += p.requests;
					cur.errors += p.error_count;
					byBucket.set(p.bucket, cur);
				}
			}
			return [...byBucket.values()].sort((a, b) =>
				a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0,
			);
		},
		staleTime: 15_000,
		gcTime: 5 * 60_000,
	});
}

/** Non-suspense histogram feed (renders its own loading/empty, never blocks). */
export function useLogsHistogram(filter: LogsFilter) {
	const { data, isLoading } = useQuery(logsHistogramQueryOptions(filter));
	return { points: data ?? [], isLoading };
}

export function logDetailQueryOptions(requestId: string) {
	return queryOptions({
		queryKey: ["logs", "detail", requestId] as const,
		queryFn: async (): Promise<LogDetail> => {
			const { data, error } = await apiClient.GET("/logs/{request_id}", {
				params: { path: { request_id: requestId } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 5 * 60_000,
		gcTime: 10 * 60_000,
	});
}

// --- Hooks ---

/**
 * Paginated log feed (newest first). Flattens the infinite-query pages into a
 * single `events` array so components render strings, not query plumbing.
 */
export function useLogs(filter: LogsFilter = {}) {
	const query = useSuspenseInfiniteQuery(logsInfiniteQueryOptions(filter));
	return {
		events: flattenEvents(query.data),
		fetchNextPage: query.fetchNextPage,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
	};
}

/** Full capture (event + captured bodies) for one request id. */
export function useLogDetail(requestId: string) {
	return useSuspenseQuery(logDetailQueryOptions(requestId));
}

function flattenEvents(data: InfiniteData<LogListPage>): LogEvent[] {
	return data.pages.flatMap((page) => page.logs ?? []);
}
