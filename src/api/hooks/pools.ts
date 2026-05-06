import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { adminDelete, adminGet, adminPost, adminPut } from "#/api/fetch";
import type {
	Pool,
	PoolCreate,
	PoolsListResponse,
	PoolUpdate,
} from "#/api/types/pool";

// --- Query options ---

export const poolsListQueryOptions = queryOptions({
	queryKey: ["pools"] as const,
	queryFn: () => adminGet<PoolsListResponse>("/admin/pools"),
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function poolDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["pools", name] as const,
		queryFn: () => adminGet<Pool>(`/admin/pools/${encodeURIComponent(name)}`),
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
		mutationFn: (data: PoolCreate) => adminPost<Pool>("/admin/pools", data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["pools"] });
		},
	});
}

export function useUpdatePool(name: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: PoolUpdate) =>
			adminPut<Pool>(`/admin/pools/${encodeURIComponent(name)}`, data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["pools"] });
		},
	});
}

export function useDeletePool() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (name: string) =>
			adminDelete(`/admin/pools/${encodeURIComponent(name)}`),
		onMutate: async (name) => {
			await queryClient.cancelQueries({ queryKey: ["pools"] });
			const previous = queryClient.getQueryData(poolsListQueryOptions.queryKey);
			queryClient.setQueryData(
				poolsListQueryOptions.queryKey,
				(old: PoolsListResponse | undefined) => {
					if (!old) return old;
					return { items: old.items.filter((p) => p.name !== name) };
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
