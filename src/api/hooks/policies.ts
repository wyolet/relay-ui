/**
 * Policy CRUD hooks. Wraps the /policies API (backend is still "Pool").
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
		const { data, error } = await apiClient.GET("/policies");
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
			const { data, error } = await apiClient.GET("/policies/{ref}", {
				params: { path: { ref: name } },
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
			const { data, error } = await apiClient.POST("/policies", {
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

export function useUpdatePolicy(id?: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (
			arg: PolicyUpdate | { id: string; body: PolicyUpdate },
		): Promise<Policy> => {
			const resolved: { id: string; body: PolicyUpdate } =
				"body" in arg && "id" in arg
					? arg
					: { id: id ?? "", body: arg as PolicyUpdate };
			const { data, error } = await apiClient.PUT("/policies/by-id/{id}", {
				params: { path: { id: resolved.id } },
				body: resolved.body,
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
		mutationFn: async (id: string): Promise<void> => {
			const { error } = await apiClient.DELETE("/policies/by-id/{id}", {
				params: { path: { id } },
			});
			if (error) throw new ApiError(0, error.error);
		},
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["policies"] });
			const previous = queryClient.getQueryData(
				policiesListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				policiesListQueryOptions.queryKey,
				(old: PolicyListResponse | undefined) => {
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

export function policyReferencesQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["policies", "references", id] as const,
		queryFn: async () => {
			const { data, error } = await apiClient.GET(
				"/policies/by-id/{id}/references",
				{ params: { path: { id } } },
			);
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		enabled: id.length > 0,
		staleTime: 10_000,
	});
}

export function usePolicyReferences(id: string | undefined) {
	return useSuspenseQuery(policyReferencesQueryOptions(id ?? ""));
}
