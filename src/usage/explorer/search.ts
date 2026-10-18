import { z } from "zod";
import {
	type ResolvedWindow,
	resolveWindow,
	USAGE_GROUP_BY,
	USAGE_RANGES,
	type UsageGroupBy,
	type UsageSummaryFilter,
} from "@/api/hooks/usage";
import { STATUS_CLASS_VALUES } from "@/logs/logFilterConfig";

export const LENSES = [
	"traffic",
	"spend",
	"tokens",
	"reliability",
	"latency",
] as const;
export type Lens = (typeof LENSES)[number];

/** Dimensions the explorer filters on: id lists the summary endpoint matches. */
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

const ids = z.array(z.string()).default([]);

export const explorerSearchSchema = z.object({
	lens: z.enum(LENSES).catch("traffic").default("traffic"),
	range: z.enum(USAGE_RANGES).catch("week").default("week"),
	from: z.string().optional(),
	to: z.string().optional(),
	group_by: z.enum(USAGE_GROUP_BY).catch("model_id").default("model_id"),
	status_class: z.enum(STATUS_CLASS_VALUES).catch("").default(""),
	model_id: ids,
	host_id: ids,
	team_id: ids,
	project_id: ids,
	principal_id: ids,
	relay_key_hash: ids,
	policy_id: ids,
	host_key_id: ids,
});
export type ExplorerSearch = z.infer<typeof explorerSearchSchema>;

/** The unfiltered view; values equal to these stay out of the URL. */
export const EXPLORER_DEFAULTS: ExplorerSearch = explorerSearchSchema.parse({});

/** The server filter the URL describes; empty facets are left out so an
 * unfiltered view keeps the same cache entries as the rest of the app. */
export function explorerFilter(s: ExplorerSearch): UsageSummaryFilter {
	const filter: UsageSummaryFilter = {};
	for (const d of FILTER_DIMENSIONS) {
		if (s[d].length) filter[d] = s[d];
	}
	if (s.status_class) filter.status_class = s.status_class;
	return filter;
}

/** The URL's window, hourly for a week so the chart shows the daily rhythm. */
export function explorerWindow(s: ExplorerSearch): ResolvedWindow {
	const win = resolveWindow(s.range, s.from, s.to);
	return s.range === "week" ? { ...win, interval: "1h" } : win;
}
