import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type {
	Pool,
	PoolCreate,
	PoolListResponse,
	PoolUpdate,
} from "@/api/types/pool";

// --- Query options ---

export const poolsListQueryOptions = queryOptions({
	queryKey: ["pools"] as const,
	queryFn: async (): Promise<PoolListResponse> => {
		const { data, error } = await apiClient.GET("/control/pools");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function poolDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["pools", name] as const,
		queryFn: async (): Promise<Pool> => {
			const { data, error } = await apiClient.GET("/control/pools/{name}", {
				params: { path: { name } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

// --- Hooks ---

export function usePools() {
	return useSuspenseQuery(poolsListQueryOptions);
}

export function usePool(name: string) {
	return useSuspenseQuery(poolDetailQueryOptions(name));
}

export function useCreatePool() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: PoolCreate): Promise<Pool> => {
			const { data, error } = await apiClient.POST("/control/pools", { body });
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["pools"] });
		},
	});
}

export function useUpdatePool(name: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: PoolUpdate): Promise<Pool> => {
			const { data, error } = await apiClient.PUT("/control/pools/{name}", {
				params: { path: { name } },
				body,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["pools"] });
		},
	});
}

export function useDeletePool() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (name: string): Promise<void> => {
			const { error } = await apiClient.DELETE("/control/pools/{name}", {
				params: { path: { name } },
			});
			if (error) throw new ApiError(0, error.error);
		},
		onMutate: async (name) => {
			await queryClient.cancelQueries({ queryKey: ["pools"] });
			const previous = queryClient.getQueryData(poolsListQueryOptions.queryKey);
			queryClient.setQueryData(
				poolsListQueryOptions.queryKey,
				(old: PoolListResponse | undefined) => {
					if (!old) return old;
					return {
						items: (old.items ?? []).filter((p) => p.metadata.name !== name),
					};
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					poolsListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["pools"] });
		},
	});
}
