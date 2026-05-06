import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { adminDelete, adminGet, adminPost, adminPut } from "#/api/fetch";
import type {
	RelayRoute,
	RelayRouteCreate,
	RelayRouteUpdate,
	RoutesListResponse,
} from "#/api/types/route";

// --- Query options ---

export const routesListQueryOptions = queryOptions({
	queryKey: ["routes"] as const,
	queryFn: () => adminGet<RoutesListResponse>("/admin/routes"),
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function routeDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["routes", name] as const,
		queryFn: () =>
			adminGet<RelayRoute>(`/admin/routes/${encodeURIComponent(name)}`),
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
		mutationFn: (data: RelayRouteCreate) =>
			adminPost<RelayRoute>("/admin/routes", data),
		onMutate: async (newRoute) => {
			await queryClient.cancelQueries({ queryKey: ["routes"] });
			const previous = queryClient.getQueryData(
				routesListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				routesListQueryOptions.queryKey,
				(old: RoutesListResponse | undefined) => {
					if (!old) return old;
					const optimistic: RelayRoute = {
						metadata: { name: newRoute.metadata.name },
						spec: { ...newRoute.spec },
					};
					return { items: [...old.items, optimistic] };
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
		mutationFn: (data: RelayRouteUpdate) =>
			adminPut<RelayRoute>(`/admin/routes/${encodeURIComponent(name)}`, data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["routes"] });
		},
	});
}

export function useDeleteRoute() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (name: string) =>
			adminDelete(`/admin/routes/${encodeURIComponent(name)}`),
		onMutate: async (name) => {
			await queryClient.cancelQueries({ queryKey: ["routes"] });
			const previous = queryClient.getQueryData(
				routesListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				routesListQueryOptions.queryKey,
				(old: RoutesListResponse | undefined) => {
					if (!old) return old;
					return {
						items: old.items.filter((r) => r.metadata.name !== name),
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
