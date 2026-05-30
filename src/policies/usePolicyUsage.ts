import { type ResourceUsageStats, useResourceUsage } from "@/api/hooks/usage";

/** Real per-policy usage totals for the Overview cards. */
export function usePolicyUsage(policyId: string): ResourceUsageStats | null {
	return useResourceUsage("policy_id", policyId);
}
