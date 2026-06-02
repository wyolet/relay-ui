import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type PolicyRateLimitView,
	policyRateLimitsQueryOptions,
	type RateLimitOverlap,
	type UnthrottledModel,
} from "@/api/hooks/policies";

export type { PolicyRateLimitView, UnthrottledModel, RateLimitOverlap };

export interface PolicyRateLimits {
	rateLimits: PolicyRateLimitView[];
	/** Granted models that no rate-limit covers (pass without throttling). */
	unthrottled: UnthrottledModel[];
	/** Bindings claimed by >1 rate-limit, with the winner (specificity-wins). */
	overlaps: RateLimitOverlap[];
}

/** Rate-limit rule sets this policy references, plus the server-computed
 * unthrottled-model and overlap analyses. */
export function usePolicyRateLimits(ref: string): PolicyRateLimits {
	const { data } = useSuspenseQuery(policyRateLimitsQueryOptions(ref));
	return {
		rateLimits: data.rateLimits ?? [],
		unthrottled: data.unthrottled ?? [],
		overlaps: data.overlaps ?? [],
	};
}
