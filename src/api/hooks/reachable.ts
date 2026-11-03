import {
	keepPreviousData,
	queryOptions,
	useQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

export type Reachable = components["schemas"]["Reachable"];
export type ReachedModel = components["schemas"]["ReachedModel"];
export type ExcludedModel = components["schemas"]["ExcludedModel"];
export type ReachRef = components["schemas"]["ReachRef"];

/**
 * What a draft policy owned by `owner` (`kind:id` or `system`) and linking
 * `poolIds` would reach, read as the policy of `account` (an account id inside
 * `owner`) when given, else of the owner's own account.
 */
export interface DraftReachRequest {
	owner: string;
	poolIds: readonly string[];
	account?: string;
}

export function draftReachQueryOptions({
	owner,
	poolIds,
	account,
}: DraftReachRequest) {
	// Keyed by the pool set: reordering pools only reorders failover, not what's
	// served, so it needn't refetch.
	const poolSet = [...poolIds].sort();
	return queryOptions({
		queryKey: [
			"catalog",
			"reachable",
			{ owner, pool: poolSet, account },
		] as const,
		queryFn: async (): Promise<Reachable> =>
			unwrap(
				await apiClient.GET("/catalog/reachable", {
					params: {
						query: {
							owner,
							...(poolIds.length > 0 ? { pool: [...poolIds] } : {}),
							...(account ? { account } : {}),
						},
					},
				}),
			),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
		// Optional read: a relay without it, an owner the caller can't create in,
		// or an account outside the owner answers an error.
		retry: false,
	});
}

/** The draft reach; nothing while `request` is undefined, the last answer while the next loads. */
export function useDraftReachQuery(request: DraftReachRequest | undefined) {
	return useQuery({
		...draftReachQueryOptions(request ?? { owner: "", poolIds: [] }),
		enabled: request !== undefined,
		placeholderData: keepPreviousData,
	});
}
