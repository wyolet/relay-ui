import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { RoleBindingList } from "@/api/types/roleBinding";
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
