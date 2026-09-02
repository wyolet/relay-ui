import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { PolicyBindingList } from "@/api/types/policyBinding";
import type { operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

/** Server-side filter/sort/page params accepted by GET /policy-bindings. */
export type PolicyBindingsListParams = NonNullable<
	operations["list_policy-bindings"]["parameters"]["query"]
>;

export function policyBindingsListQuery(params: PolicyBindingsListParams) {
	return queryOptions({
		queryKey: ["policy-bindings", "list", params] as const,
		queryFn: async (): Promise<PolicyBindingList> => {
			const data = unwrap(
				await apiClient.GET("/policy-bindings", { params: { query: params } }),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/** The policy bindings of one project. Non-suspending: the project page
 * renders without them. */
export function usePolicyBindingsInProject(projectId: string) {
	return useQuery({
		...policyBindingsListQuery({ project_id: [projectId] }),
		enabled: projectId.length > 0,
	});
}
