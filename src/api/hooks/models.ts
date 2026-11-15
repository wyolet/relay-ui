import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { DetachedLinks } from "@/api/types/errors";
import type { Model, ModelListResponse } from "@/api/types/model";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

// --- Query options ---

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

/**
 * A model's enabled/deprecated state feeds the picker catalog and the
 * server-side joins that resolve which models each policy grants and each host
 * serves. Invalidating a bare domain prefix (e.g. `["policies"]`) marks that
 * domain's list *and* every `["policies", ref, …]` join beneath it stale — the
 * broad-prefix convention used for cross-domain invalidation throughout
 * `src/api/hooks`.
 */
function invalidateModelDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	for (const key of [["models"], ["catalog"], ["policies"], ["hosts"]]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
}

export function useModels() {
	return useSuspenseQuery(modelsListQueryOptions);
}

export function useModel(name: string) {
	return useSuspenseQuery(modelDetailQueryOptions(name));
}

/** The models list with one model swapped for `next`. */
function withModel(
	list: ModelListResponse | undefined,
	next: Model,
): ModelListResponse | undefined {
	return (
		list && {
			...list,
			items: (list.items ?? []).map((m) =>
				m.metadata.id === next.metadata.id ? next : m,
			),
		}
	);
}

/** Switches a model on or off. The list and the model's own cache entry flip
 * before the request so a switch never shows the old state while the save
 * runs; the saved model then replaces them (fresh resourceVersion for the next
 * toggle), and a failed save puts the old ones back. */
export function useSetModelEnabled() {
	const queryClient = useQueryClient();
	const key = modelsListQueryOptions.queryKey;
	return useMutation({
		mutationFn: async ({
			model,
			enabled,
		}: {
			model: Model;
			enabled: boolean;
		}): Promise<Model> =>
			unwrap(
				await apiClient.PUT("/models/by-id/{id}", {
					params: { path: { id: model.metadata.id ?? "" } },
					body: {
						metadata: model.metadata,
						spec: { ...model.spec, enabled },
					},
				}),
			),
		onMutate: async ({ model, enabled }) => {
			const detail = modelDetailQueryOptions(model.metadata.name).queryKey;
			await queryClient.cancelQueries({ queryKey: key, exact: true });
			await queryClient.cancelQueries({ queryKey: detail, exact: true });
			const previous = queryClient.getQueryData(key);
			const previousDetail = queryClient.getQueryData(detail);
			const next = { ...model, spec: { ...model.spec, enabled } };
			queryClient.setQueryData(key, (list) => withModel(list, next));
			if (previousDetail) queryClient.setQueryData(detail, next);
			return { previous, previousDetail, detail };
		},
		onSuccess: (saved, _vars, context) => {
			queryClient.setQueryData(key, (list) => withModel(list, saved));
			if (context.previousDetail)
				queryClient.setQueryData(context.detail, saved);
		},
		onError: (_err, _vars, context) => {
			if (!context) return;
			if (context.previous) queryClient.setQueryData(key, context.previous);
			if (context.previousDetail)
				queryClient.setQueryData(context.detail, context.previousDetail);
		},
		onSettled: () => {
			invalidateModelDependents(queryClient);
		},
	});
}

/** Resolves to the links the delete took from rows that stay (empty on 204). */
export function useDeleteModel() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<DetachedLinks[]> => {
			const data = unwrap(
				await apiClient.DELETE("/models/by-id/{id}", {
					params: { path: { id } },
				}),
			);
			return data?.detached ?? [];
		},
		onSuccess: () => {
			invalidateModelDependents(queryClient);
		},
	});
}
