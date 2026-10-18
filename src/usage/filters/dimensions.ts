import type { UsageGroupBy, UsageSummaryFilter } from "@/api/hooks/usage";

/** Dimensions usage views and Logs filter on: id lists the server matches. */
export const FILTER_DIMENSIONS = [
	"model_id",
	"host_id",
	"team_id",
	"project_id",
	"principal_id",
	"relay_key_hash",
	"policy_id",
	"host_key_id",
] as const satisfies readonly (keyof UsageSummaryFilter & UsageGroupBy)[];
export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

export function isFilterDimension(d: UsageGroupBy): d is FilterDimension {
	return FILTER_DIMENSIONS.some((f) => f === d);
}
