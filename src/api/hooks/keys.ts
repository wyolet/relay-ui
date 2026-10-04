import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type {
	CreateKeyInput,
	CreateKeyResponse,
	Key,
	KeyList,
	RotateKeyResponse,
} from "@/api/types/key";
import type { operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

/** Server-side filter/sort/page params accepted by GET /keys. */
export type KeysListParams = NonNullable<
	operations["list_keys"]["parameters"]["query"]
>;

export const keysListQueryOptions = queryOptions({
	queryKey: ["keys"] as const,
	queryFn: async (): Promise<KeyList> => {
		const data = unwrap(await apiClient.GET("/keys"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

/** Filtered list driven by a table page's filter state (server-side). */
export function keysListQuery(params: KeysListParams) {
	return queryOptions({
		queryKey: ["keys", "list", params] as const,
		queryFn: async (): Promise<KeyList> => {
			const data = unwrap(
				await apiClient.GET("/keys", { params: { query: params } }),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function useKeysList(params: KeysListParams) {
	return useSuspenseQuery(keysListQuery(params));
}

/** The keys issued to a set of principals — how a project's keys are
 * listed, since /keys has no project filter of its own. Non-suspending:
 * the caller renders without them. */
export function useKeysForPrincipals(principalIds: string[]) {
	return useQuery({
		...keysListQuery({ principal_id: principalIds }),
		enabled: principalIds.length > 0,
	});
}

export function keyDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["keys", ref] as const,
		queryFn: async (): Promise<Key> => {
			const data = unwrap(
				await apiClient.GET("/keys/{ref}", {
					params: { path: { ref } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/**
 * A key references a policy; a mutation dirties that policy's
 * "references" view (which keys use it).
 */
function invalidateKeyDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	for (const key of [["keys"], ["policies", "references"]]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
}

export function useKeys() {
	return useSuspenseQuery(keysListQueryOptions);
}

export function useKey(ref: string) {
	return useSuspenseQuery(keyDetailQueryOptions(ref));
}

export function useCreateKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: CreateKeyInput): Promise<CreateKeyResponse> => {
			const data = unwrap(await apiClient.POST("/keys", { body }));
			return data;
		},
		onSuccess: () => {
			invalidateKeyDependents(queryClient);
		},
	});
}

export function useUpdateKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: Key;
		}): Promise<Key> => {
			const data = unwrap(
				await apiClient.PUT("/keys/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
			return data;
		},
		onSuccess: () => {
			invalidateKeyDependents(queryClient);
		},
	});
}

export function useRotateKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			graceSeconds,
		}: {
			id: string;
			/** How long the previous secret keeps authenticating. 0 = immediate. */
			graceSeconds: number;
		}): Promise<RotateKeyResponse> => {
			const data = unwrap(
				await apiClient.POST("/keys/by-id/{id}/rotate", {
					params: { path: { id } },
					body: { graceSeconds },
				}),
			);
			return data;
		},
		onSuccess: () => {
			invalidateKeyDependents(queryClient);
		},
		onError: (err) => {
			// 409 means the row moved under us; the cached copy is stale either
			// way, so re-read before the caller retries.
			if (err instanceof ApiError && err.status === 409) {
				invalidateKeyDependents(queryClient);
			}
		},
	});
}

export function useDeleteKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.DELETE("/keys/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onSuccess: () => {
			invalidateKeyDependents(queryClient);
		},
	});
}
