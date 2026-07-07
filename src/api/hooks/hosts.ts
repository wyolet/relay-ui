import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { Host, HostListResponse, HostUpdate } from "@/api/types/host";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

/** One model this host serves: binding + the pricing attached to it. */
export type HostModelRow = components["schemas"]["HostModelRow"];
type HostModelsResponse = components["schemas"]["hostModelsOutBody"];

export const hostsListQueryOptions = queryOptions({
	queryKey: ["hosts"] as const,
	queryFn: async (): Promise<HostListResponse> => {
		const data = unwrap(await apiClient.GET("/hosts"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function hostDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["hosts", ref] as const,
		queryFn: async (): Promise<Host> => {
			const data = unwrap(
				await apiClient.GET("/hosts/{ref}", {
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
 * The models a host serves, each with its binding and attached pricing — the
 * authoritative rate source for exact (model, host) cost attribution.
 * `ref` accepts a slug or UUIDv7 id.
 */
export function hostModelsQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["hosts", ref, "models"] as const,
		queryFn: async (): Promise<HostModelsResponse> => {
			const data = unwrap(
				await apiClient.GET("/hosts/{ref}/models", {
					params: { path: { ref } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function useHosts() {
	return useSuspenseQuery(hostsListQueryOptions);
}

export function useHost(ref: string) {
	return useSuspenseQuery(hostDetailQueryOptions(ref));
}

export function useUpdateHost() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: HostUpdate;
		}): Promise<Host> => {
			return unwrap(
				await apiClient.PUT("/hosts/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["hosts"] });
		},
	});
}

export function useDeleteHost() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.DELETE("/hosts/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["hosts"] });
			const previous = queryClient.getQueryData(hostsListQueryOptions.queryKey);
			queryClient.setQueryData(
				hostsListQueryOptions.queryKey,
				(old: HostListResponse | undefined) => {
					if (!old) return old;
					return {
						items: (old.items ?? []).filter((h) => h.metadata.id !== id),
						total: old.total,
					};
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					hostsListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["hosts"] });
		},
	});
}
