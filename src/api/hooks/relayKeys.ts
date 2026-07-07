import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type {
	CreateRelayKeyInput,
	CreateRelayKeyResponse,
	RelayKey,
	RelayKeyList,
} from "@/api/types/relayKey";
import { unwrap } from "@/api/unwrap";

export const relayKeysListQueryOptions = queryOptions({
	queryKey: ["relay-keys"] as const,
	queryFn: async (): Promise<RelayKeyList> => {
		const data = unwrap(await apiClient.GET("/relay-keys"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function relayKeyDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["relay-keys", ref] as const,
		queryFn: async (): Promise<RelayKey> => {
			const data = unwrap(
				await apiClient.GET("/relay-keys/{ref}", {
					params: { path: { ref } },
				}),
			);
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
			const data = unwrap(await apiClient.POST("/relay-keys", { body }));
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
			const data = unwrap(
				await apiClient.PUT("/relay-keys/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
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
			unwrap(
				await apiClient.DELETE("/relay-keys/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["relay-keys"] });
		},
	});
}
