/**
 * Policy CRUD hooks. Wraps the /policies API (backend is still "Pool").
 * Query keys use ["policies"] so UI invalidations are consistent with the new name.
 */
import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type {
	Policy,
	PolicyCreate,
	PolicyListResponse,
	PolicyUpdate,
} from "@/api/types/policy";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

export const policiesListQueryOptions = queryOptions({
	queryKey: ["policies"] as const,
	queryFn: async (): Promise<PolicyListResponse> => {
		const data = unwrap(await apiClient.GET("/policies"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

/** The project-owned policies. `owner` filters by kind only, so the owning
 * project is matched here — the one client-side narrowing in this path. */
export function projectPoliciesQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["policies", "project", projectId] as const,
		queryFn: async (): Promise<PolicyListResponse> => {
			const data = unwrap(
				await apiClient.GET("/policies", {
					params: { query: { owner: "project" } },
				}),
			);
			return {
				...data,
				items: (data.items ?? []).filter(
					(p) => p.metadata.owner?.id === projectId,
				),
			};
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/** Non-suspending: the project page renders without its policies. */
export function useProjectPolicies(projectId: string) {
	return useQuery({
		...projectPoliciesQueryOptions(projectId),
		enabled: projectId.length > 0,
	});
}

export function policyDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["policies", name] as const,
		queryFn: async (): Promise<Policy> => {
			const data = unwrap(
				await apiClient.GET("/policies/{ref}", {
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

/** One concrete (provider, model, host) binding this policy grants, with the
 * grant ref(s) that matched it and the limits the policy applies to it. */
export type PolicyModelView = components["schemas"]["PolicyBindingRow"];
/** A model the policy does NOT grant, with the reason (debug view only). */
export type PolicyModelExclusion =
	components["schemas"]["PolicyModelExclusion"];
/** One host this policy can reach, with the host-keys that reach it. */
export type PolicyHostView = components["schemas"]["PolicyHostRow"];
/** One rate-limit rule set this policy references, with its limits + models. */
export type PolicyRateLimitView = components["schemas"]["PolicyRateLimitRow"];
/** A granted model that no rate-limit covers — passes without throttling. */
export type UnthrottledModel = components["schemas"]["UnthrottledModel"];
/** A binding claimed by >1 rate-limit, and which one won (specificity-wins). */
export type RateLimitOverlap = components["schemas"]["RateLimitOverlap"];

/** Models the policy grants (resolved server-side), with effective limits. */
export function policyModelsQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["policies", ref, "models"] as const,
		queryFn: async (): Promise<
			components["schemas"]["policyModelsOutBody"]
		> => {
			const data = unwrap(
				await apiClient.GET("/policies/{ref}/models", {
					params: { path: { ref } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/** Debug variant: also returns `excluded` — every model the policy does NOT
 * grant, with the reason. Separate query key so the default view never pays
 * for it; fetched lazily when the user opens the "why excluded" panel. */
export function policyModelsDebugQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["policies", ref, "models", "debug"] as const,
		queryFn: async (): Promise<
			components["schemas"]["policyModelsOutBody"]
		> => {
			const data = unwrap(
				await apiClient.GET("/policies/{ref}/models", {
					params: { path: { ref }, query: { debug: true } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/** Hosts the policy can reach, each with the host-keys that reach it. */
export function policyHostsQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["policies", ref, "hosts"] as const,
		queryFn: async (): Promise<components["schemas"]["policyHostsOutBody"]> => {
			const data = unwrap(
				await apiClient.GET("/policies/{ref}/hosts", {
					params: { path: { ref } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/** Rate-limit rule sets the policy references, resolved server-side. */
export function policyRateLimitsQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["policies", ref, "rate-limits"] as const,
		queryFn: async (): Promise<
			components["schemas"]["policyRateLimitsOutBody"]
		> => {
			const data = unwrap(
				await apiClient.GET("/policies/{ref}/rate-limits", {
					params: { path: { ref } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function usePolicies() {
	return useSuspenseQuery(policiesListQueryOptions);
}

export function usePolicy(name: string) {
	return useSuspenseQuery(policyDetailQueryOptions(name));
}

export function useCreatePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: PolicyCreate): Promise<Policy> => {
			const data = unwrap(
				await apiClient.POST("/policies", {
					body,
				}),
			);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["policies"] });
		},
	});
}

export function useUpdatePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: PolicyUpdate;
		}): Promise<Policy> => {
			return unwrap(
				await apiClient.PUT("/policies/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["policies"] });
		},
	});
}

export function useDeletePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.DELETE("/policies/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["policies"] });
		},
	});
}

export function policyReferencesQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["policies", "references", id] as const,
		queryFn: async () => {
			const data = unwrap(
				await apiClient.GET("/policies/by-id/{id}/references", {
					params: { path: { id } },
				}),
			);
			return data;
		},
		enabled: id.length > 0,
		staleTime: 10_000,
	});
}

export function usePolicyReferences(id: string | undefined) {
	return useSuspenseQuery(policyReferencesQueryOptions(id ?? ""));
}

interface DetachHostKeyArgs {
	policyId: string;
	hostKeyId: string;
	policies: Policy[];
}

/**
 * Removes a host key from a user policy's `hostKeyIds` pool. The detachment
 * surfaces on both ends — `policy.spec.hostKeyIds` and `hostKey.policies` —
 * so we invalidate both query keys on success. Lives in the api layer (below
 * every domain) so host-keys can call it without a reverse policies dependency.
 */
export function useDetachHostKeyFromPolicy() {
	const updatePolicy = useUpdatePolicy();
	const queryClient = useQueryClient();

	async function detach({ policyId, hostKeyId, policies }: DetachHostKeyArgs) {
		const policy = policies.find((p) => p.metadata.id === policyId);
		if (!policy) {
			toast("error", "Policy not found — refresh and retry.");
			return;
		}
		const nextHostKeyIds = (policy.spec.hostKeyIds ?? []).filter(
			(id) => id !== hostKeyId,
		);
		try {
			await updatePolicy.mutateAsync({
				id: policyId,
				body: {
					metadata: policy.metadata,
					spec: {
						...policy.spec,
						hostKeyIds: nextHostKeyIds.length > 0 ? nextHostKeyIds : null,
					},
				},
			});
			// `hostKey.policies` is computed server-side; refetch host keys so the
			// detached entry disappears from any list/detail view that reads it.
			void queryClient.invalidateQueries({ queryKey: ["host-keys"] });
			toast("success", `Detached from "${displayLabel(policy.metadata)}".`);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to detach from policy.",
			);
		}
	}

	return { detach, isPending: updatePolicy.isPending };
}
