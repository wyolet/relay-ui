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

/** A logged request — the same Event shape as /usage/events. */
export type LogEvent = components["schemas"]["Event"];
export type LogListPage = components["schemas"]["logsListOutputBody"];
/** Full capture: the event plus (when opted in) request/response bodies. */
export type LogDetail = components["schemas"]["logGetOutputBody"];
export type LogPayload = components["schemas"]["logPayload"];

const LIST_PAGE_SIZE = 100;

// --- Query options ---

export function logsInfiniteQueryOptions() {
	return infiniteQueryOptions({
		queryKey: ["logs", "list"] as const,
		queryFn: async ({ pageParam }): Promise<LogListPage> => {
			const { data, error } = await apiClient.GET("/logs", {
				params: {
					query: {
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
export function useLogs() {
	const query = useSuspenseInfiniteQuery(logsInfiniteQueryOptions());
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
