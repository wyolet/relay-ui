import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type {
	HostKey,
	HostKeyCreate,
	HostKeyListResponse,
	HostKeyUpdate,
} from "@/api/types/hostkey";
import type { components } from "@/api/types.gen";

/** Circuit-breaker status for one host key (see /host-keys/by-id/{id}/health). */
export type HostKeyHealth = components["schemas"]["hostKeyHealth"];

export const hostKeysListQueryOptions = queryOptions({
	queryKey: ["host-keys"] as const,
	queryFn: async (): Promise<HostKeyListResponse> => {
		const { data, error } = await apiClient.GET("/host-keys");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function hostKeyDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["host-keys", ref] as const,
		queryFn: async (): Promise<HostKey> => {
			const { data, error } = await apiClient.GET("/host-keys/{ref}", {
				params: { path: { ref } },
			});
			if (error) throw new ApiError(0, error.error);
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
			const { data, error } = await apiClient.GET(
				"/host-keys/by-id/{id}/health",
				{ params: { path: { id } } },
			);
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		// Breaker state is live operational data — keep it fresh on the dashboard.
		staleTime: 15_000,
		refetchInterval: 30_000,
		gcTime: 5 * 60_000,
	});
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
			const { data, error } = await apiClient.POST("/host-keys", { body });
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["host-keys"] });
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
			const { data, error } = await apiClient.PUT("/host-keys/by-id/{id}", {
				params: { path: { id } },
				body,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["host-keys"] });
		},
	});
}

export function useDeleteHostKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			const { error } = await apiClient.DELETE("/host-keys/by-id/{id}", {
				params: { path: { id } },
			});
			if (error) throw new ApiError(0, error.error);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["host-keys"] });
		},
	});
}
