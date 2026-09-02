import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type {
	PolicyBinding,
	PolicyBindingList,
} from "@/api/types/policyBinding";
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

export function policyBindingDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["policy-bindings", ref] as const,
		queryFn: async (): Promise<PolicyBinding> => {
			const data = unwrap(
				await apiClient.GET("/policy-bindings/{ref}", {
					params: { path: { ref } },
				}),
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

export function usePolicyBindingsList(params: PolicyBindingsListParams) {
	return useSuspenseQuery(policyBindingsListQuery(params));
}

export function usePolicyBinding(ref: string) {
	return useSuspenseQuery(policyBindingDetailQueryOptions(ref));
}

export function useCreatePolicyBinding() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: PolicyBinding): Promise<PolicyBinding> => {
			const data = unwrap(await apiClient.POST("/policy-bindings", { body }));
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["policy-bindings"] });
		},
	});
}

export function useUpdatePolicyBinding() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: PolicyBinding;
		}): Promise<PolicyBinding> => {
			const data = unwrap(
				await apiClient.PUT("/policy-bindings/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["policy-bindings"] });
		},
	});
}

export function useDeletePolicyBinding() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.DELETE("/policy-bindings/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["policy-bindings"] });
		},
	});
}
