import type { UsageGroupBy, UsageSummaryFilter } from "@/api/hooks/usage";
import { isRefusal, REFUSALS } from "@/lib/refusal";

/** Dimensions usage views and Logs filter on: id lists the server matches. */
export const FILTER_DIMENSIONS = [
	"model_id",
	"host_id",
	"team_id",
	"project_id",
	"principal_id",
	"lane_account_id",
	"relay_key_hash",
	"policy_id",
	"host_key_id",
	"refusal",
] as const satisfies readonly (keyof UsageSummaryFilter & UsageGroupBy)[];
export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

/** Dimensions whose values are a closed set, offered even before any
 * traffic carries them. */
export const FIXED_DIMENSION_VALUES: Partial<
	Record<FilterDimension, readonly string[]>
> = { refusal: REFUSALS };

export function isFilterDimension(d: UsageGroupBy): d is FilterDimension {
	return FILTER_DIMENSIONS.some((f) => f === d);
}

/** The server filter for the chosen values; empty dimensions stay out, and
 * refusal values the relay doesn't send are dropped. */
export function dimensionFilter(
	values: Record<FilterDimension, string[]>,
): Pick<UsageSummaryFilter, FilterDimension> {
	const filter: Pick<UsageSummaryFilter, FilterDimension> = {};
	for (const d of FILTER_DIMENSIONS) {
		if (d === "refusal") continue;
		if (values[d].length) filter[d] = values[d];
	}
	const refusals = values.refusal.filter(isRefusal);
	if (refusals.length) filter.refusal = refusals;
	return filter;
}
