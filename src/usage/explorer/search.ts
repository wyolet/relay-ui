import { z } from "zod";
import {
	type ResolvedWindow,
	resolveWindow,
	USAGE_GROUP_BY,
	USAGE_RANGES,
	type UsageRange,
	type UsageSummaryFilter,
} from "@/api/hooks/usage";
import { STATUS_CLASS_VALUES } from "@/logs/logFilterConfig";
import {
	dimensionFilter,
	FILTER_DIMENSIONS,
	type FilterDimension,
} from "@/usage/filters/dimensions";

export const LENSES = [
	"traffic",
	"spend",
	"tokens",
	"reliability",
	"latency",
] as const;
export type Lens = (typeof LENSES)[number];

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
	lane_account_id: ids,
	via_account_id: ids,
	relay_key_hash: ids,
	policy_id: ids,
	host_key_id: ids,
	refusal: ids,
});
export type ExplorerSearch = z.infer<typeof explorerSearchSchema>;

/** The unfiltered view; values equal to these stay out of the URL. */
export const EXPLORER_DEFAULTS: ExplorerSearch = explorerSearchSchema.parse({});

/** The server filter the URL describes; empty facets are left out so an
 * unfiltered view keeps the same cache entries as the rest of the app. */
export function explorerFilter(s: ExplorerSearch): UsageSummaryFilter {
	const filter: UsageSummaryFilter = dimensionFilter(s);
	if (s.status_class) filter.status_class = s.status_class;
	return filter;
}

/** The URL's window, hourly for a week so the chart shows the daily rhythm. */
export function explorerWindow(s: ExplorerSearch): ResolvedWindow {
	const win = resolveWindow(s.range, s.from, s.to);
	return s.range === "week" ? { ...win, interval: "1h" } : win;
}

/** The same view with every filter dropped; range, lens and group-by stay. */
export function clearFilters(s: ExplorerSearch): ExplorerSearch {
	const cleared: ExplorerSearch = { ...s, status_class: "" };
	for (const d of FILTER_DIMENSIONS) cleared[d] = [];
	return cleared;
}

/** The logs window that covers a usage range. */
export const LOGS_SINCE: Record<UsageRange, "24h" | "7d" | "30d"> = {
	today: "24h",
	week: "7d",
	month: "30d",
	custom: "30d",
};

/** The Logs search showing the requests behind this view. */
export function logsSearch(s: ExplorerSearch) {
	const scope: Partial<Record<FilterDimension, string[]>> = {};
	for (const d of FILTER_DIMENSIONS) if (s[d].length) scope[d] = s[d];
	return { ...scope, since: LOGS_SINCE[s.range], status_class: s.status_class };
}
