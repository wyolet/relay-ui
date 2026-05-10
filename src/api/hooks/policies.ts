/**
 * Policy CRUD hooks. Wraps the /control/pools API (backend is still "Pool").
 * Query keys use ["policies"] so UI invalidations are consistent with the new name.
 */
import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type {
	Policy,
	PolicyCreate,
	PolicyListResponse,
	PolicyUpdate,
} from "@/api/types/policy";

export const policiesListQueryOptions = queryOptions({
	queryKey: ["policies"] as const,
	queryFn: async (): Promise<PolicyListResponse> => {
		const { data, error } = await apiClient.GET("/control/pools");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function policyDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["policies", name] as const,
		queryFn: async (): Promise<Policy> => {
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

export function usePolicies() {
	return useSuspenseQuery(policiesListQueryOptions);
}

export function usePolicy(name: string) {
	return useSuspenseQuery(policyDetailQueryOptions(name));
}

export function useCreatePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: PolicyCreate): Promise<Policy> => {
			const { data, error } = await apiClient.POST("/control/pools", { body });
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["policies"] });
		},
	});
}

export function useUpdatePolicy(name: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: PolicyUpdate): Promise<Policy> => {
			const { data, error } = await apiClient.PUT("/control/pools/{name}", {
				params: { path: { name } },
				body,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["policies"] });
		},
	});
}

export function useDeletePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (name: string): Promise<void> => {
			const { error } = await apiClient.DELETE("/control/pools/{name}", {
				params: { path: { name } },
			});
			if (error) throw new ApiError(0, error.error);
		},
		onMutate: async (name) => {
			await queryClient.cancelQueries({ queryKey: ["policies"] });
			const previous = queryClient.getQueryData(
				policiesListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				policiesListQueryOptions.queryKey,
				(old: PolicyListResponse | undefined) => {
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
					policiesListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["policies"] });
		},
	});
}
