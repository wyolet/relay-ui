import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { Role, RoleList } from "@/api/types/role";
import type { operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

/** Server-side filter/sort/page params accepted by GET /roles. */
export type RolesListParams = NonNullable<
	operations["list_roles"]["parameters"]["query"]
>;

export const rolesListQueryOptions = queryOptions({
	queryKey: ["roles"] as const,
	queryFn: async (): Promise<RoleList> => {
		const data = unwrap(await apiClient.GET("/roles"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function rolesListQuery(params: RolesListParams) {
	return queryOptions({
		queryKey: ["roles", "list", params] as const,
		queryFn: async (): Promise<RoleList> => {
			const data = unwrap(
				await apiClient.GET("/roles", { params: { query: params } }),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function roleDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["roles", ref] as const,
		queryFn: async (): Promise<Role> => {
			const data = unwrap(
				await apiClient.GET("/roles/{ref}", { params: { path: { ref } } }),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function roleReferencesQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["roles", "references", id] as const,
		queryFn: async () => {
			const data = unwrap(
				await apiClient.GET("/roles/by-id/{id}/references", {
					params: { path: { id } },
				}),
			);
			return data;
		},
		enabled: id.length > 0,
		staleTime: 10_000,
	});
}

/** Role bindings name roles, so both lists move when a role does. */
function invalidateRoleDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	for (const key of [["roles"], ["role-bindings"]]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
}

export function useRoles() {
	return useSuspenseQuery(rolesListQueryOptions);
}

export function useRolesList(params: RolesListParams) {
	return useSuspenseQuery(rolesListQuery(params));
}

export function useRole(ref: string) {
	return useSuspenseQuery(roleDetailQueryOptions(ref));
}

export function useRoleReferences(id: string | undefined) {
	return useSuspenseQuery(roleReferencesQueryOptions(id ?? ""));
}

export function useCreateRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: Role): Promise<Role> => {
			const data = unwrap(await apiClient.POST("/roles", { body }));
			return data;
		},
		onSuccess: () => {
			invalidateRoleDependents(queryClient);
		},
	});
}

export function useUpdateRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: Role;
		}): Promise<Role> => {
			const data = unwrap(
				await apiClient.PUT("/roles/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
			return data;
		},
		onSuccess: () => {
			invalidateRoleDependents(queryClient);
		},
	});
}

export function useDeleteRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.DELETE("/roles/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onSuccess: () => {
			invalidateRoleDependents(queryClient);
		},
	});
}
