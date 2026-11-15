import type { WeekUsageScope } from "@/usage/weekUsageQueries";

/** The policy's week of usage, its traffic split by model. */
export function policyWeekScope(policyId: string): WeekUsageScope {
	return { filter: { policy_id: [policyId] }, splitBy: "model_id" };
}

export const POLICY_NO_TRAFFIC =
	"Requests running under this policy show up here: spend, latency, errors and the models they called.";
