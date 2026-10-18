import {
	type ResolvedWindow,
	type UsageGroupBy,
	type UsageSummaryFilter,
	useLatencySeries,
	useLatencyTotals,
	useUsageOverview,
} from "@/api/hooks/usage";
import type { FigureData } from "@/shared/FigureRow";
import { fmtCompact, fmtMs } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import type { ExplorerColumn, ExplorerRow } from "./ExplorerTable";
import { UNSET_KEY } from "./lensRows";

export const LATENCY_COLUMNS: ExplorerColumn[] = [
	{ key: "p95", label: "p95" },
	{ key: "p50", label: "p50" },
	{ key: "p99", label: "p99" },
	{ key: "max", label: "Max" },
	{ key: "ttft50", label: "First token p50" },
	{ key: "ttft95", label: "First token p95" },
	{ key: "requests", label: "Requests" },
];

const ms = (n: number | undefined) => (n != null && n > 0 ? fmtMs(n) : "—");

/** How long requests take in the slice: percentiles, time to first token,
 * p95 over time for the busiest groups, slowest first in the table. */
export function useLatencyLens(
	groupBy: UsageGroupBy,
	win: ResolvedWindow,
	filter: UsageSummaryFilter,
) {
	const totals = useLatencyTotals(win, filter);
	const { groups, labels } = useUsageOverview(groupBy, win, filter);
	const lines = useLatencySeries(groupBy, win, filter);
	const labelFor = useGroupLabeler(groupBy, labels);

	const d = totals?.duration;
	const figures: FigureData[] = [
		{ key: "p50", label: "p50", value: ms(d?.p50), note: "median" },
		{ key: "p95", label: "p95", value: ms(d?.p95), note: `p99 ${ms(d?.p99)}` },
		{
			key: "max",
			label: "Slowest",
			value: ms(d?.max),
			note: `avg ${ms(d?.avg)}`,
		},
		{
			key: "ttft",
			label: "First token p95",
			value: ms(totals?.ttft?.p95),
			note: `p50 ${ms(totals?.ttft?.p50)}`,
		},
	];

	const ranked = [...groups].sort((a, b) => b.duration.p95 - a.duration.p95);
	const top = Math.max(1, ...ranked.map((g) => g.duration.p95));
	const rows: ExplorerRow[] = ranked.map((g, i) => ({
		key: g.key,
		label: g.key === UNSET_KEY ? "Unassigned" : labelFor(g.key),
		share: g.duration.p95 / top,
		lead: i === 0,
		drillable: g.key !== UNSET_KEY,
		cells: {
			p95: ms(g.duration.p95),
			p50: ms(g.duration.p50),
			p99: ms(g.duration.p99),
			max: ms(g.duration.max),
			ttft50: ms(g.ttft?.p50),
			ttft95: ms(g.ttft?.p95),
			requests: fmtCompact(g.requests),
		},
		sort: {
			p95: g.duration.p95,
			p50: g.duration.p50,
			p99: g.duration.p99,
			max: g.duration.max,
			ttft50: g.ttft?.p50 ?? 0,
			ttft95: g.ttft?.p95 ?? 0,
			requests: g.requests,
		},
	}));

	return { figures, lines, rows };
}
