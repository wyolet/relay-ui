import {
	type ResolvedWindow,
	type UsageGroupBy,
	type UsageSummaryFilter,
	useErrorTimeline,
	useUsageOverview,
	useUsageOverviewWithDeltas,
} from "@/api/hooks/usage";
import type { FigureData } from "@/shared/FigureRow";
import type { RankRow } from "@/shared/RankList";
import { fmtCompact, fmtPct } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import type { ExplorerColumn, ExplorerRow } from "./ExplorerTable";
import { changeText, UNSET_KEY } from "./lensRows";

export const RELIABILITY_COLUMNS: ExplorerColumn[] = [
	{ key: "failed", label: "Failed" },
	{ key: "rate", label: "Failure rate" },
	{ key: "server", label: "5xx" },
	{ key: "client", label: "4xx" },
	{ key: "requests", label: "Requests" },
	{ key: "change", label: "vs previous" },
];

function rankRows(
	groups: { key: string; requests: number }[],
	total: number,
): RankRow[] {
	const top = Math.max(1, ...groups.map((g) => g.requests));
	return groups.slice(0, 8).map((g) => ({
		key: g.key,
		label: g.key === UNSET_KEY ? "Unspecified" : g.key,
		share: g.requests / top,
		value: `${fmtCompact(g.requests)} · ${fmtPct(total > 0 ? g.requests / total : 0)}`,
	}));
}

/** Failures in the slice: how many, server or client side, throttled, what
 * kind, how responses finished, split by the group-by worst first. */
export function useReliabilityLens(
	groupBy: UsageGroupBy,
	win: ResolvedWindow,
	filter: UsageSummaryFilter,
) {
	const {
		kpis,
		groups,
		previousGroups: before,
		labels,
	} = useUsageOverviewWithDeltas(groupBy, win, filter);
	const timeline = useErrorTimeline(groupBy, win, filter);
	const kinds = useUsageOverview("error_kind", win, {
		...filter,
		error: "true",
	});
	const finishes = useUsageOverview("finish_reason", win, filter);
	const labelFor = useGroupLabeler(groupBy, labels);

	const { serverErrors: server, clientErrors: client, throttled } = kpis;
	const of = (n: number) =>
		`${fmtPct(kpis.requests > 0 ? n / kpis.requests : 0)} of requests`;
	const figures: FigureData[] = [
		{
			key: "rate",
			label: "Failure rate",
			value: fmtPct(kpis.errorRate),
			note: `${fmtCompact(kpis.errors)} failed`,
		},
		{
			key: "server",
			label: "Server errors (5xx)",
			value: fmtCompact(server),
			note: of(server),
		},
		{
			key: "client",
			label: "Client errors (4xx)",
			value: fmtCompact(client),
			note: of(client),
		},
		{
			key: "throttled",
			label: "Throttled (429)",
			value: fmtCompact(throttled),
			note: of(throttled),
		},
	];

	const ranked = [...groups].sort(
		(a, b) => b.errorCount - a.errorCount || b.errorRate - a.errorRate,
	);
	const top = Math.max(1, ...ranked.map((g) => g.errorCount));
	const previousBy = new Map(before.map((g) => [g.key, g]));
	const rows: ExplorerRow[] = ranked.map((g, i) => {
		const s = { server: g.serverErrors, client: g.clientErrors };
		return {
			key: g.key,
			label: g.key === UNSET_KEY ? "Unassigned" : labelFor(g.key),
			share: g.errorCount / top,
			lead: i === 0 && g.errorCount > 0,
			drillable: g.key !== UNSET_KEY,
			cells: {
				failed: fmtCompact(g.errorCount),
				rate: g.errorCount > 0 ? fmtPct(g.errorRate) : "—",
				server: s.server > 0 ? fmtCompact(s.server) : "—",
				client: s.client > 0 ? fmtCompact(s.client) : "—",
				requests: fmtCompact(g.requests),
				change: changeText((x) => x.errorCount, g, previousBy.get(g.key)),
			},
			sort: {
				failed: g.errorCount,
				rate: g.errorRate,
				server: s.server,
				client: s.client,
				requests: g.requests,
				change: g.errorCount - (previousBy.get(g.key)?.errorCount ?? 0),
			},
		};
	});

	return {
		figures,
		timeline,
		hasErrors: server + client > 0,
		rows,
		errorKinds: rankRows(kinds.groups, kinds.kpis.requests),
		finishReasons: rankRows(finishes.groups, finishes.kpis.requests),
	};
}
