import {
	type UsageGroupBy,
	type UsageGroupStat,
	useUsageOverviewWithDeltas,
} from "@/api/hooks/usage";
import { compareValue } from "@/lib/usage-math/delta";
import type { SegmentedOption } from "@/shared/Segmented";
import {
	fmtCompact,
	fmtMoneyCompact,
	fmtPct,
	fmtSignedPct,
} from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import { useDashboardWindow } from "./useDashboardWindow";

export type BreakdownDimension = Extract<
	UsageGroupBy,
	"model_id" | "host_id" | "team_id" | "project_id" | "relay_key_hash"
>;

export const BREAKDOWN_DIMENSIONS: SegmentedOption<BreakdownDimension>[] = [
	{ value: "model_id", label: "Models" },
	{ value: "host_id", label: "Hosts" },
	{ value: "team_id", label: "Teams" },
	{ value: "project_id", label: "Projects" },
	{ value: "relay_key_hash", label: "Keys" },
];

const LIMIT = 8;
/** Usage rows for traffic with no value in the dimension (no team, …). */
const UNSET_KEY = "—";

export interface BreakdownRow {
	key: string;
	label: string;
	/** Bar length against the top row, 0..1. */
	share: number;
	/** The top row's bar takes the data accent. */
	lead: boolean;
	requests: string;
	failed: string;
	tokens: string;
	spend: string;
	change: string;
}

/** Spend, falling back to requests when nothing in the dimension is priced. */
function weight(g: UsageGroupStat, priced: boolean): number {
	return priced ? (g.cost.usd ?? 0) : g.requests;
}

/** The period's top rows in one dimension, ranked by spend, with movement
 * against the previous period. `more` counts the rows past the limit. */
export function useBreakdown(groupBy: BreakdownDimension): {
	rows: BreakdownRow[];
	more: number;
	total: string;
} {
	const { win } = useDashboardWindow();
	const {
		groups,
		previousGroups: before,
		labels,
	} = useUsageOverviewWithDeltas(groupBy, win);
	const labelFor = useGroupLabeler(groupBy, labels);

	const priced = groups.some((g) => (g.cost.usd ?? 0) > 0);
	const ranked = [...groups].sort(
		(a, b) => weight(b, priced) - weight(a, priced),
	);
	const top = Math.max(1e-9, ...ranked.map((g) => weight(g, priced)));
	const previousBy = new Map(before.map((g) => [g.key, g]));

	const rows = ranked.slice(0, LIMIT).map((g, i) => {
		const prev = previousBy.get(g.key);
		const delta = prev
			? compareValue(weight(g, priced), weight(prev, priced))
			: null;
		return {
			key: g.key,
			label: g.key === UNSET_KEY ? "Unassigned" : labelFor(g.key),
			share: weight(g, priced) / top,
			lead: i === 0,
			requests: fmtCompact(g.requests),
			failed: g.errorCount > 0 ? fmtPct(g.errorRate) : "—",
			tokens: fmtCompact(g.tokens),
			spend: g.cost.usd != null ? fmtMoneyCompact(g.cost.usd, "USD") : "—",
			change: !prev
				? "new"
				: delta?.ratio != null
					? fmtSignedPct(delta.ratio)
					: "—",
		};
	});

	const spend = groups.reduce((sum, g) => sum + (g.cost.usd ?? 0), 0);
	const count = `${groups.length} ${groups.length === 1 ? "row" : "rows"}`;
	return {
		rows,
		more: Math.max(groups.length - LIMIT, 0),
		total: priced ? `${count} · ${fmtMoneyCompact(spend, "USD")} total` : count,
	};
}
