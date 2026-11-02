import { useMemo } from "react";
import { usePolicies } from "@/api/hooks/policies";
import type { Policy } from "@/api/types/policy";

export interface RateLimitPolicyRef {
	policy: Policy;
	/** The link's model scope; empty applies the limit to every request. */
	models: readonly string[];
}

/**
 * Every policy link to this rate limit. A policy can appear more than once,
 * one entry per `rateLimits` link with its own model scope.
 */
export function useRateLimitReferences(
	rateLimitId: string | undefined,
): RateLimitPolicyRef[] {
	const { data } = usePolicies();
	return useMemo(() => {
		if (!rateLimitId) return [];
		return (data.items ?? []).flatMap((policy) =>
			(policy.spec.rateLimits ?? [])
				.filter((l) => l.rateLimitId === rateLimitId)
				.map((l) => ({ policy, models: l.models ?? [] })),
		);
	}, [data, rateLimitId]);
}
