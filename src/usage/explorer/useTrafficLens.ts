import {
	type ResolvedWindow,
	type UsageGroupBy,
	type UsageSummaryFilter,
	useStackedSeries,
	useUsageOverviewWithDeltas,
} from "@/api/hooks/usage";
import { fmtAgo } from "@/lib/format";
import type { FigureData } from "@/shared/FigureRow";
import {
	fmtBucketTick,
	fmtCompact,
	fmtPct,
	fmtSignedPct,
	RANGE_COMPARE_LABELS,
} from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import type { ExplorerColumn, ExplorerRow } from "./ExplorerTable";
import { changeText, UNSET_KEY } from "./lensRows";

export const TRAFFIC_COLUMNS: ExplorerColumn[] = [
	{ key: "requests", label: "Requests" },
	{ key: "share", label: "Of total" },
	{ key: "failed", label: "Failed" },
	{ key: "tokens", label: "Tokens" },
	{ key: "lastSeen", label: "Last seen" },
	{ key: "change", label: "vs previous" },
];

/** Requests in the explorer's slice: how many, how many failed, who sent
 * them and when, split by the group-by. */
export function useTrafficLens(
	groupBy: UsageGroupBy,
	win: ResolvedWindow,
	filter: UsageSummaryFilter,
	compareLabel: string = RANGE_COMPARE_LABELS.custom,
) {
	const {
		kpis,
		deltas,
		groups,
		previousGroups: before,
		labels,
	} = useUsageOverviewWithDeltas(groupBy, win, filter);
	const series = useStackedSeries(groupBy, win, "requests", filter);
	const labelFor = useGroupLabeler(groupBy, labels);

	const peak = series.points.reduce<{ bucket: string; total: number }>(
		(best, p) => {
			const total = series.series.reduce((s, k) => s + Number(p[k] ?? 0), 0);
			return total > best.total ? { bucket: p.bucket, total } : best;
		},
		{ bucket: "", total: 0 },
	);

	const figures: FigureData[] = [
		{
			key: "requests",
			label: "Requests",
			value: fmtCompact(kpis.requests),
			note:
				deltas.hasBaseline && deltas.requests.ratio != null
					? `${fmtSignedPct(deltas.requests.ratio)} ${compareLabel}`
					: undefined,
		},
		{
			key: "failed",
			label: "Failed",
			value: fmtCompact(kpis.errors),
			note: `${fmtPct(kpis.errorRate)} of requests`,
		},
		{
			key: "keys",
			label: "Active keys",
			value: kpis.activeKeys !== undefined ? fmtCompact(kpis.activeKeys) : "—",
			note:
				deltas.hasBaseline && deltas.activeKeys?.ratio != null
					? `${fmtSignedPct(deltas.activeKeys.ratio)} ${compareLabel}`
					: `${fmtCompact(groups.length)} ${groups.length === 1 ? "group" : "groups"} in view`,
		},
		{
			key: "peak",
			label: "Busiest",
			value: peak.total > 0 ? fmtBucketTick(peak.bucket, "1d") : "—",
			note:
				win.interval === "1d"
					? `${fmtCompact(peak.total)} requests`
					: `${fmtBucketTick(peak.bucket, win.interval)} · ${fmtCompact(peak.total)} requests`,
		},
	];

	const previousBy = new Map(before.map((g) => [g.key, g]));
	const top = Math.max(1, ...groups.map((g) => g.requests));
	const rows: ExplorerRow[] = groups.map((g, i) => ({
		key: g.key,
		label: g.key === UNSET_KEY ? "Unassigned" : labelFor(g.key),
		share: g.requests / top,
		lead: i === 0,
		drillable: g.key !== UNSET_KEY,
		cells: {
			requests: fmtCompact(g.requests),
			share: fmtPct(kpis.requests > 0 ? g.requests / kpis.requests : 0),
			failed: g.errorCount > 0 ? fmtPct(g.errorRate) : "—",
			tokens: fmtCompact(g.tokens),
			lastSeen: fmtAgo(g.lastSeen),
			change: changeText((s) => s.requests, g, previousBy.get(g.key)),
		},
		sort: {
			requests: g.requests,
			share: g.requests,
			failed: g.errorRate,
			tokens: g.tokens,
			lastSeen: Date.parse(g.lastSeen) || 0,
			change: g.requests - (previousBy.get(g.key)?.requests ?? 0),
		},
	}));

	return { figures, series, rows };
}
