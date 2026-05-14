import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { Host, HostListResponse, HostUpdate } from "@/api/types/host";

export const hostsListQueryOptions = queryOptions({
	queryKey: ["hosts"] as const,
	queryFn: async (): Promise<HostListResponse> => {
		const { data, error } = await apiClient.GET("/hosts");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function hostDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["hosts", ref] as const,
		queryFn: async (): Promise<Host> => {
			const { data, error } = await apiClient.GET("/hosts/{ref}", {
				params: { path: { ref } },
			});
			if (error) throw new ApiError(0, error.error);
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

export function useUpdateHost(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: HostUpdate): Promise<Host> => {
			const { data, error } = await apiClient.PUT("/hosts/by-id/{id}", {
				params: { path: { id } },
				body,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["hosts"] });
		},
	});
}
