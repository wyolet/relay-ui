import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { RoleBinding, RoleBindingList } from "@/api/types/roleBinding";
import type { operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

/** Server-side filter/sort/page params accepted by GET /role-bindings. */
export type RoleBindingsListParams = NonNullable<
	operations["list_role-bindings"]["parameters"]["query"]
>;

export function roleBindingsListQuery(params: RoleBindingsListParams) {
	return queryOptions({
		queryKey: ["role-bindings", "list", params] as const,
		queryFn: async (): Promise<RoleBindingList> => {
			const data = unwrap(
				await apiClient.GET("/role-bindings", { params: { query: params } }),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function roleBindingDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["role-bindings", ref] as const,
		queryFn: async (): Promise<RoleBinding> => {
			const data = unwrap(
				await apiClient.GET("/role-bindings/{ref}", {
					params: { path: { ref } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/** The bindings granting access at one team/project scope. Non-suspending:
 * the scope page renders without them. */
export function useRoleBindingsAtScope(
	scopeKind: "team" | "project",
	scopeId: string,
) {
	return useQuery({
		...roleBindingsListQuery({
			scope_kind: scopeKind,
			scope_id: [scopeId],
		}),
		enabled: scopeId.length > 0,
	});
}

export function useRoleBindingsList(params: RoleBindingsListParams) {
	return useSuspenseQuery(roleBindingsListQuery(params));
}

export function useRoleBinding(ref: string) {
	return useSuspenseQuery(roleBindingDetailQueryOptions(ref));
}

export function useCreateRoleBinding() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: RoleBinding): Promise<RoleBinding> => {
			const data = unwrap(await apiClient.POST("/role-bindings", { body }));
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["role-bindings"] });
		},
	});
}

export function useUpdateRoleBinding() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: RoleBinding;
		}): Promise<RoleBinding> => {
			const data = unwrap(
				await apiClient.PUT("/role-bindings/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["role-bindings"] });
		},
	});
}

export function useDeleteRoleBinding() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.DELETE("/role-bindings/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["role-bindings"] });
		},
	});
}
