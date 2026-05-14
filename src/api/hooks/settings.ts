import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";

export type ProxyMode = components["schemas"]["ProxyMode"];
export type ProxyModeEnvelope = components["schemas"]["ProxyModeEnvelope"];

export const proxyModeQueryOptions = queryOptions({
	queryKey: ["settings", "proxy-mode"] as const,
	queryFn: async (): Promise<ProxyModeEnvelope> => {
		const { data, error } = await apiClient.GET("/settings/proxy-mode");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function useProxyMode() {
	return useSuspenseQuery(proxyModeQueryOptions);
}

export function useUpdateProxyMode() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (value: ProxyMode): Promise<ProxyModeEnvelope> => {
			const { data, error } = await apiClient.PUT("/settings/proxy-mode", {
				body: value,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}
