import { useMemo } from "react";
import { usePolicies } from "@/api/hooks/policies";
import type { Policy } from "@/api/types/policy";

export interface RateLimitPolicyRef {
	policy: Policy;
	/** True when this RL is the policy's default (spec.rateLimitId). */
	isDefault: boolean;
	/** Scoped catalog refs from a binding; empty for default ref. */
	refs: readonly string[];
	/** Stable index for keying bindings. */
	bindingIndex: number;
}

/**
 * Every policy reference to this rate limit. Each policy can appear more than
 * once: once as the default, plus one entry per matching rlBinding.
 */
export function useRateLimitReferences(
	rateLimitId: string | undefined,
): RateLimitPolicyRef[] {
	const { data } = usePolicies();
	return useMemo(() => {
		if (!rateLimitId) return [];
		const out: RateLimitPolicyRef[] = [];
		for (const policy of data.items ?? []) {
			if (policy.spec.rateLimitId === rateLimitId) {
				out.push({ policy, isDefault: true, refs: [], bindingIndex: -1 });
			}
			(policy.spec.rlBindings ?? []).forEach((b, i) => {
				if (b.rateLimitId === rateLimitId) {
					out.push({
						policy,
						isDefault: false,
						refs: b.models ?? [],
						bindingIndex: i,
					});
				}
			});
		}
		return out;
	}, [data, rateLimitId]);
}
