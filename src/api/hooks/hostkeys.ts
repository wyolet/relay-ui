import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type {
	HostKey,
	HostKeyCreate,
	HostKeyListResponse,
	HostKeyUpdate,
} from "@/api/types/hostkey";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

/** Circuit-breaker status for one host key (see /host-keys/by-id/{id}/health). */
export type HostKeyHealth = components["schemas"]["hostKeyHealth"];

export const hostKeysListQueryOptions = queryOptions({
	queryKey: ["host-keys"] as const,
	queryFn: async (): Promise<HostKeyListResponse> => {
		const data = unwrap(await apiClient.GET("/host-keys"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function hostKeyDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["host-keys", ref] as const,
		queryFn: async (): Promise<HostKey> => {
			const data = unwrap(
				await apiClient.GET("/host-keys/{ref}", {
					params: { path: { ref } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function hostKeyHealthQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["host-keys", id, "health"] as const,
		queryFn: async (): Promise<HostKeyHealth> => {
			const data = unwrap(
				await apiClient.GET("/host-keys/by-id/{id}/health", {
					params: { path: { id } },
				}),
			);
			return data;
		},
		// Breaker state is live operational data — keep it fresh on the dashboard.
		staleTime: 15_000,
		refetchInterval: 30_000,
		gcTime: 5 * 60_000,
	});
}

/**
 * Host-keys gate which hosts a policy can reach, so a mutation dirties the
 * reachability graph (host-bindings + picker catalog) and the server-side
 * policy/host joins built from it.
 */
function invalidateHostKeyDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	for (const key of [
		["host-keys"],
		["host-bindings"],
		["catalog"],
		["policies"],
		["hosts"],
	]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
}

export function useHostKeys() {
	return useSuspenseQuery(hostKeysListQueryOptions);
}

export function useHostKey(ref: string) {
	return useSuspenseQuery(hostKeyDetailQueryOptions(ref));
}

export function useCreateHostKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: HostKeyCreate): Promise<HostKey> => {
			const data = unwrap(await apiClient.POST("/host-keys", { body }));
			return data;
		},
		onSuccess: () => {
			invalidateHostKeyDependents(queryClient);
		},
	});
}

export function useUpdateHostKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: HostKeyUpdate;
		}): Promise<HostKey> => {
			const data = unwrap(
				await apiClient.PUT("/host-keys/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
			return data;
		},
		onSuccess: () => {
			invalidateHostKeyDependents(queryClient);
		},
	});
}

export function useDeleteHostKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.DELETE("/host-keys/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onSuccess: () => {
			invalidateHostKeyDependents(queryClient);
		},
	});
}
