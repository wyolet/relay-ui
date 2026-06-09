import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type {
	CreateRelayKeyInput,
	CreateRelayKeyResponse,
	RelayKey,
	RelayKeyList,
	RotateRelayKeyResponse,
} from "@/api/types/relayKey";

export const relayKeysListQueryOptions = queryOptions({
	queryKey: ["relay-keys"] as const,
	queryFn: async (): Promise<RelayKeyList> => {
		const { data, error } = await apiClient.GET("/relay-keys");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function relayKeyDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["relay-keys", ref] as const,
		queryFn: async (): Promise<RelayKey> => {
			const { data, error } = await apiClient.GET("/relay-keys/{ref}", {
				params: { path: { ref } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function useRelayKeys() {
	return useSuspenseQuery(relayKeysListQueryOptions);
}

export function useRelayKey(ref: string) {
	return useSuspenseQuery(relayKeyDetailQueryOptions(ref));
}

export function useCreateRelayKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (
			body: CreateRelayKeyInput,
		): Promise<CreateRelayKeyResponse> => {
			const { data, error } = await apiClient.POST("/relay-keys", { body });
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["relay-keys"] });
		},
	});
}

export function useUpdateRelayKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: RelayKey;
		}): Promise<RelayKey> => {
			const { data, error } = await apiClient.PUT("/relay-keys/by-id/{id}", {
				params: { path: { id } },
				body,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["relay-keys"] });
		},
	});
}

export function useRotateRelayKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<RotateRelayKeyResponse> => {
			const { data, error } = await apiClient.POST(
				"/relay-keys/by-id/{id}/rotate",
				{ params: { path: { id } } },
			);
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["relay-keys"] });
		},
	});
}

export function useDeleteRelayKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			const { error } = await apiClient.DELETE("/relay-keys/by-id/{id}", {
				params: { path: { id } },
			});
			if (error) throw new ApiError(0, error.error);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["relay-keys"] });
		},
	});
}
