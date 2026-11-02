import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type PolicyRateLimitView,
	policyRateLimitsQueryOptions,
	type UnthrottledModel,
} from "@/api/hooks/policies";

export type { PolicyRateLimitView, UnthrottledModel };

export interface PolicyRateLimits {
	rateLimits: PolicyRateLimitView[];
	/** Granted models that no rate-limit covers (pass without throttling). */
	unthrottled: UnthrottledModel[];
}

/** Rate limits this policy links, plus the server-computed unthrottled models. */
export function usePolicyRateLimits(ref: string): PolicyRateLimits {
	const { data } = useSuspenseQuery(policyRateLimitsQueryOptions(ref));
	return {
		rateLimits: data.rateLimits ?? [],
		unthrottled: data.unthrottled ?? [],
	};
}
