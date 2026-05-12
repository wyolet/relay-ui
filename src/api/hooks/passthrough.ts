import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";

export type Passthrough = components["schemas"]["Passthrough"];
export type PassthroughSpec = components["schemas"]["PassthroughSpec"];

export const passthroughQueryOptions = queryOptions({
	queryKey: ["passthrough"] as const,
	queryFn: async (): Promise<Passthrough> => {
		const { data, error } = await apiClient.GET("/control/passthrough");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function usePassthrough() {
	return useSuspenseQuery(passthroughQueryOptions);
}

export function useUpdatePassthrough() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: Passthrough): Promise<Passthrough> => {
			const { data, error } = await apiClient.PUT("/control/passthrough", {
				body,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["passthrough"] });
		},
	});
}
