import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { Provider, ProviderListResponse } from "@/api/types/provider";

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

export function providerDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["providers", ref] as const,
		queryFn: async (): Promise<Provider> => {
			const { data, error } = await apiClient.GET("/providers/{ref}", {
				params: { path: { ref } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function useProviders() {
	return useSuspenseQuery(providersListQueryOptions);
}

export function useProvider(ref: string) {
	return useSuspenseQuery(providerDetailQueryOptions(ref));
}
