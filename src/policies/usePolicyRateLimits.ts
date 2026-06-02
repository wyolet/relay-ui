import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type PolicyRateLimitView,
	policyRateLimitsQueryOptions,
} from "@/api/hooks/policies";

export type { PolicyRateLimitView };

/** Rate-limit rule sets this policy references, resolved server-side. */
export function usePolicyRateLimits(ref: string): PolicyRateLimitView[] {
	const { data } = useSuspenseQuery(policyRateLimitsQueryOptions(ref));
	return data.rateLimits ?? [];
}
