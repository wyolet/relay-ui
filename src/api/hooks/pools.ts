import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { keepAcrossScopes, usableList } from "@/api/hooks/usableList";
import type { DetachedLinks } from "@/api/types/errors";
import type { components, operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";
import type { UsableList } from "@/lib/workContext";

export type Pool = components["schemas"]["Pool"];
export type PoolSpec = components["schemas"]["PoolSpec"];
export type PoolList = components["schemas"]["PoolList"];
/** Server-side filter/sort/page params accepted by GET /pools. */
export type PoolsListParams = NonNullable<
	operations["list_pools"]["parameters"]["query"]
>;

export const poolListQueryOptions = queryOptions({
	queryKey: ["pools"] as const,
	queryFn: async (): Promise<PoolList> => unwrap(await apiClient.GET("/pools")),
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function poolListQuery(params: PoolsListParams) {
	return queryOptions({
		queryKey: ["pools", "list", params] as const,
		queryFn: async (): Promise<PoolList> =>
			unwrap(await apiClient.GET("/pools", { params: { query: params } })),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function poolDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["pools", ref] as const,
		queryFn: async (): Promise<Pool> =>
			unwrap(
				await apiClient.GET("/pools/{ref}", { params: { path: { ref } } }),
			),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function poolReferencesQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["pools", "references", id] as const,
		queryFn: async () =>
			unwrap(
				await apiClient.GET("/pools/by-id/{id}/references", {
					params: { path: { id } },
				}),
			),
		enabled: id.length > 0,
		staleTime: 10_000,
	});
}

function invalidatePoolDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	for (const key of [["pools"], ["policies"]]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
}

export function usePools() {
	return useSuspenseQuery(poolListQueryOptions);
}

export function usePoolsList(params: PoolsListParams) {
	return useSuspenseQuery(poolListQuery(params));
}

export function usablePoolsQuery(
	usableBy: string | undefined,
	params: PoolsListParams = {},
) {
	const list = poolListQuery({ ...params, usable_by: usableBy });
	return queryOptions({
		...list,
		placeholderData: keepAcrossScopes(list.queryKey),
	});
}

/** The pools a row owned by `usableBy` may link, narrowed by `params`; the last scope's rows while a new scope loads. */
export function useUsablePools(
	usableBy: string | undefined,
	params: PoolsListParams = {},
	{ enabled = true }: { enabled?: boolean } = {},
): UsableList<Pool> {
	return usableList(
		useQuery({ ...usablePoolsQuery(usableBy, params), enabled }),
	);
}

export function usePool(ref: string) {
	return useSuspenseQuery(poolDetailQueryOptions(ref));
}

export function usePoolReferences(id: string | undefined) {
	return useSuspenseQuery(poolReferencesQueryOptions(id ?? ""));
}

export function useCreatePool() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: Pool): Promise<Pool> =>
			unwrap(await apiClient.POST("/pools", { body })),
		onSuccess: () => invalidatePoolDependents(queryClient),
	});
}

export function useUpdatePool() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: Pool;
		}): Promise<Pool> =>
			unwrap(
				await apiClient.PUT("/pools/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			),
		onSuccess: () => invalidatePoolDependents(queryClient),
	});
}

/** Resolves to the links the delete took from rows that stay (empty on 204). */
export function useDeletePool() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<DetachedLinks[]> => {
			const data = unwrap(
				await apiClient.DELETE("/pools/by-id/{id}", {
					params: { path: { id } },
				}),
			);
			return data?.detached ?? [];
		},
		onSuccess: () => invalidatePoolDependents(queryClient),
	});
}

/** The pool's host keys in prioritized order, secret-free. */
export function poolKeysQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["pools", ref, "keys"] as const,
		queryFn: async () =>
			unwrap(
				await apiClient.GET("/pools/{ref}/keys", {
					params: { path: { ref } },
				}),
			),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function usePoolKeys(ref: string) {
	return useSuspenseQuery(poolKeysQueryOptions(ref));
}
