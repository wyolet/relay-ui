import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type {
	Provider,
	ProviderCreate,
	ProviderListResponse,
	ProviderUpdate,
} from "@/api/types/provider";

// --- Query options ---

export const providersListQueryOptions = queryOptions({
	queryKey: ["providers"] as const,
	queryFn: async (): Promise<ProviderListResponse> => {
		const { data, error } = await apiClient.GET("/providers");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function providerDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["providers", name] as const,
		queryFn: async (): Promise<Provider> => {
			const { data, error } = await apiClient.GET("/providers/{ref}", {
				params: { path: { ref: name } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

// --- Hooks ---

export function useProviders() {
	return useSuspenseQuery(providersListQueryOptions);
}

export function useProvider(name: string) {
	return useSuspenseQuery(providerDetailQueryOptions(name));
}

export function useCreateProvider() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: ProviderCreate): Promise<Provider> => {
			const { data, error } = await apiClient.POST("/providers", {
				body,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["providers"] });
		},
		onMutate: async (newProvider) => {
			await queryClient.cancelQueries({ queryKey: ["providers"] });
			const previous = queryClient.getQueryData(
				providersListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				providersListQueryOptions.queryKey,
				(old: ProviderListResponse | undefined) => {
					if (!old) return old;
					const optimistic: Provider = {
						metadata: { name: newProvider.metadata.name },
						spec: { ...newProvider.spec },
					};
					return { items: [...(old.items ?? []), optimistic] };
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					providersListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
	});
}

export function useUpdateProvider(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: ProviderUpdate): Promise<Provider> => {
			const { data, error } = await apiClient.PUT(
				"/providers/by-id/{id}",
				{
					params: { path: { id } },
					body,
				},
			);
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["providers"] });
		},
	});
}

export function useDeleteProvider() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			const { error } = await apiClient.DELETE(
				"/providers/by-id/{id}",
				{
					params: { path: { id } },
				},
			);
			if (error) throw new ApiError(0, error.error);
		},
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["providers"] });
			const previous = queryClient.getQueryData(
				providersListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				providersListQueryOptions.queryKey,
				(old: ProviderListResponse | undefined) => {
					if (!old) return old;
					return {
						items: (old.items ?? []).filter((p) => p.metadata.id !== id),
					};
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					providersListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["providers"] });
		},
	});
}
