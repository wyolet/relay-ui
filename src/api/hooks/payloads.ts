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

/** A single captured request/response record. In list responses the bodies
 * are stripped; the detail endpoint returns them populated. */
export type PayloadRecord = components["schemas"]["Record"];
export type PayloadListPage = components["schemas"]["payloadListOutputBody"];

const LIST_PAGE_SIZE = 100;

// --- Query options ---

export function payloadsInfiniteQueryOptions() {
	return infiniteQueryOptions({
		queryKey: ["payloads", "list"] as const,
		queryFn: async ({ pageParam }): Promise<PayloadListPage> => {
			const { data, error } = await apiClient.GET("/payloads", {
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

export function payloadRecordQueryOptions(requestId: string) {
	return queryOptions({
		queryKey: ["payloads", "record", requestId] as const,
		queryFn: async (): Promise<PayloadRecord> => {
			const { data, error } = await apiClient.GET("/payloads/{request_id}", {
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
 * Paginated capture list (newest first). Flattens the infinite-query pages
 * into a single `records` array so components render strings, not plumbing.
 */
export function usePayloads() {
	const query = useSuspenseInfiniteQuery(payloadsInfiniteQueryOptions());
	return {
		records: flattenRecords(query.data),
		fetchNextPage: query.fetchNextPage,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
	};
}

/** Full captured bodies for one request id. */
export function usePayloadRecord(requestId: string) {
	return useSuspenseQuery(payloadRecordQueryOptions(requestId));
}

function flattenRecords(data: InfiniteData<PayloadListPage>): PayloadRecord[] {
	return data.pages.flatMap((page) => page.records ?? []);
}
