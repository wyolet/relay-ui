import {
	type InfiniteData,
	infiniteQueryOptions,
	queryOptions,
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
