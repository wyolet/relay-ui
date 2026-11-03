import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { DetachedLinks } from "@/api/types/errors";
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

/** The policy bindings a team or project owns. Non-suspending: the owner's
 * page renders without them. */
export function usePolicyBindingsOwnedBy(ownerId: string) {
	return useQuery({
		...policyBindingsListQuery({ owner_id: [ownerId] }),
		enabled: ownerId.length > 0,
	});
}

/** Every binding the caller may see; the list has no default page size. */
export const policyBindingsAllQueryOptions = policyBindingsListQuery({});

/** Every visible binding, non-suspending: the pages that read it render without it. */
export function usePolicyBindings() {
	return useQuery(policyBindingsAllQueryOptions);
}

export function usePolicyBindingsList(params: PolicyBindingsListParams) {
	return useSuspenseQuery(policyBindingsListQuery(params));
}

export function usePolicyBinding(ref: string) {
	return useSuspenseQuery(policyBindingDetailQueryOptions(ref));
}

/** A binding links a policy to accounts, so a write dirties that policy's references and the accounts' limits. */
function invalidatePolicyBindingDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	for (const key of [["policy-bindings"], ["policies", "references"]]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
	void queryClient.invalidateQueries({
		queryKey: ["accounts"],
		predicate: (q) => q.queryKey[2] === "limits",
	});
}

/**
 * Binds the account to a policy (null unbinds it) in one step: relay takes it
 * out of the binding that holds it and, for a policy, gives it a binding of its own.
 */
export function useSetAccountPolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			accountRef,
			policyId,
		}: {
			accountRef: string;
			policyId: string | null;
		}) =>
			unwrap(
				await apiClient.PUT("/accounts/{ref}/policy", {
					params: { path: { ref: accountRef } },
					body: { policyId },
				}),
			),
		onSuccess: () => invalidatePolicyBindingDependents(queryClient),
	});
}

export function useCreatePolicyBinding() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: PolicyBinding): Promise<PolicyBinding> => {
			const data = unwrap(await apiClient.POST("/policy-bindings", { body }));
			return data;
		},
		onSuccess: () => {
			invalidatePolicyBindingDependents(queryClient);
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
			invalidatePolicyBindingDependents(queryClient);
		},
	});
}

/** Resolves to the links the delete took from rows that stay (empty on 204). */
export function useDeletePolicyBinding() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<DetachedLinks[]> => {
			const data = unwrap(
				await apiClient.DELETE("/policy-bindings/by-id/{id}", {
					params: { path: { id } },
				}),
			);
			return data?.detached ?? [];
		},
		onSuccess: () => {
			invalidatePolicyBindingDependents(queryClient);
		},
	});
}
