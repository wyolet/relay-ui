import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type {
	Model,
	ModelCreate,
	ModelListResponse,
	ModelUpdate,
} from "@/api/types/model";
import type { components, operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

// --- Query options ---

/** Server-side filter/sort/page params accepted by GET /models. */
export type ModelsListParams = NonNullable<
	operations["list_models"]["parameters"]["query"]
>;

/** Unfiltered full list — used by pickers, loaders, and the resource graph
 * that need every model regardless of any page's active filters. */
export const modelsListQueryOptions = queryOptions({
	queryKey: ["models"] as const,
	queryFn: async (): Promise<ModelListResponse> => {
		// limit=0 explicitly opts out of the server's default page window
		// (relay >= 0.6 returns 100 models when no limit is given).
		const data = unwrap(
			await apiClient.GET("/models", {
				params: { query: { limit: 0 } },
			}),
		);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

/** Filtered list driven by a table page's filter state (server-side). */
export function modelsListQuery(params: ModelsListParams) {
	return queryOptions({
		queryKey: ["models", "list", params] as const,
		queryFn: async (): Promise<ModelListResponse> => {
			const data = unwrap(
				await apiClient.GET("/models", {
					params: { query: params },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function useModelsList(params: ModelsListParams) {
	return useSuspenseQuery(modelsListQuery(params));
}

export function modelDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["models", name] as const,
		queryFn: async (): Promise<Model> => {
			const data = unwrap(
				await apiClient.GET("/models/{ref}", {
					params: { path: { ref: name } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

// --- Composed sub-resource views (server-side joins) ---

/** One host that serves a model: its binding + the host + attached pricing. */
export type ModelHostView = components["schemas"]["ModelHostRow"];
/** One policy that grants a model, with the limits it applies to it. */
export type ModelPolicyView = components["schemas"]["ModelPolicyRow"];

/** Hosts serving a model (binding + pricing per host), joined server-side. */
export function modelHostsQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["models", ref, "hosts"] as const,
		queryFn: async (): Promise<components["schemas"]["modelHostsOutBody"]> => {
			const data = unwrap(
				await apiClient.GET("/models/{ref}/hosts", {
					params: { path: { ref } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/** Policies that grant a model, with the limits each applies. */
export function modelPoliciesQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["models", ref, "policies"] as const,
		queryFn: async (): Promise<
			components["schemas"]["modelPoliciesOutBody"]
		> => {
			const data = unwrap(
				await apiClient.GET("/models/{ref}/policies", {
					params: { path: { ref } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

// --- Hooks ---

export function useModels() {
	return useSuspenseQuery(modelsListQueryOptions);
}

export function useModel(name: string) {
	return useSuspenseQuery(modelDetailQueryOptions(name));
}

export function useCreateModel() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: ModelCreate): Promise<Model> => {
			const data = unwrap(await apiClient.POST("/models", { body }));
			return data;
		},
		onMutate: async (newModel) => {
			await queryClient.cancelQueries({ queryKey: ["models"] });
			const previous = queryClient.getQueryData(
				modelsListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				modelsListQueryOptions.queryKey,
				(old: ModelListResponse | undefined) => {
					if (!old) return old;
					const optimistic: Model = {
						metadata: { name: newModel.metadata.name },
						spec: { ...newModel.spec },
					};
					return {
						...old,
						items: [...(old.items ?? []), optimistic],
						total: old.total + 1,
					};
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					modelsListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["models"] });
		},
	});
}

export function useUpdateModel(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: ModelUpdate): Promise<Model> => {
			const data = unwrap(
				await apiClient.PUT("/models/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["models"] });
		},
	});
}

export function useDeleteModel() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.DELETE("/models/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["models"] });
			const previous = queryClient.getQueryData(
				modelsListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				modelsListQueryOptions.queryKey,
				(old: ModelListResponse | undefined) => {
					if (!old) return old;
					return {
						items: (old.items ?? []).filter((m) => m.metadata.id !== id),
						total: old.total,
					};
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					modelsListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["models"] });
		},
	});
}
