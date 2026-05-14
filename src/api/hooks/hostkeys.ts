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

export function useUpdateHostKey(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: HostKeyUpdate): Promise<HostKey> => {
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
