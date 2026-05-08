import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "#/api/client";
import { ApiError } from "#/api/types/errors";
import type {
	RelayRoute,
	RelayRouteCreate,
	RelayRouteUpdate,
	RouteListResponse,
} from "#/api/types/route";

// --- Query options ---

export const routesListQueryOptions = queryOptions({
	queryKey: ["routes"] as const,
	queryFn: async (): Promise<RouteListResponse> => {
		const { data, error } = await apiClient.GET("/control/routes");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function routeDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["routes", name] as const,
		queryFn: async (): Promise<RelayRoute> => {
			const { data, error } = await apiClient.GET("/control/routes/{name}", {
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

export function useRoutes() {
	return useSuspenseQuery(routesListQueryOptions);
}

export function useRoute(name: string) {
	return useSuspenseQuery(routeDetailQueryOptions(name));
}

export function useCreateRoute() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: RelayRouteCreate): Promise<RelayRoute> => {
			const { data, error } = await apiClient.POST("/control/routes", { body });
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onMutate: async (newRoute) => {
			await queryClient.cancelQueries({ queryKey: ["routes"] });
			const previous = queryClient.getQueryData(
				routesListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				routesListQueryOptions.queryKey,
				(old: RouteListResponse | undefined) => {
					if (!old) return old;
					const optimistic: RelayRoute = {
						metadata: { name: newRoute.metadata.name },
						spec: { ...newRoute.spec },
					};
					return { items: [...(old.items ?? []), optimistic] };
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					routesListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["routes"] });
		},
	});
}

export function useUpdateRoute(name: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: RelayRouteUpdate): Promise<RelayRoute> => {
			const { data, error } = await apiClient.PUT("/control/routes/{name}", {
				params: { path: { name } },
				body,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["routes"] });
		},
	});
}

export function useDeleteRoute() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (name: string): Promise<void> => {
			const { error } = await apiClient.DELETE("/control/routes/{name}", {
				params: { path: { name } },
			});
			if (error) throw new ApiError(0, error.error);
		},
		onMutate: async (name) => {
			await queryClient.cancelQueries({ queryKey: ["routes"] });
			const previous = queryClient.getQueryData(
				routesListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				routesListQueryOptions.queryKey,
				(old: RouteListResponse | undefined) => {
					if (!old) return old;
					return {
						items: (old.items ?? []).filter((r) => r.metadata.name !== name),
					};
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					routesListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["routes"] });
		},
	});
}
