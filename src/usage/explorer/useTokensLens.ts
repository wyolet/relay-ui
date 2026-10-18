import {
	type ResolvedWindow,
	type UsageGroupBy,
	type UsageSummaryFilter,
	usageComparisonWindows,
	useMeterSeries,
	useUsageNow,
	useUsageOverview,
	useUsageOverviewWithDeltas,
} from "@/api/hooks/usage";
import type { FigureData } from "@/shared/FigureRow";
import { fmtCompact, fmtPct, fmtSignedPct } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import type { ExplorerColumn, ExplorerRow } from "./ExplorerTable";
import { changeText, UNSET_KEY } from "./lensRows";

export const TOKENS_COLUMNS: ExplorerColumn[] = [
	{ key: "tokens", label: "Tokens" },
	{ key: "share", label: "Of total" },
	{ key: "input", label: "Fresh input" },
	{ key: "output", label: "Generated" },
	{ key: "cached", label: "From cache" },
	{ key: "perRequest", label: "Per request" },
	{ key: "change", label: "vs previous" },
];

/** Tokens in the slice: how many, how many were generated, how much the
 * cache served, split by meter over time and by the group-by. */
export function useTokensLens(
	groupBy: UsageGroupBy,
	win: ResolvedWindow,
	filter: UsageSummaryFilter,
	compareLabel: string,
) {
	const { kpis, deltas, groups } = useUsageOverviewWithDeltas(
		groupBy,
		win,
		filter,
	);
	const { previous } = usageComparisonWindows(win, useUsageNow());
	const { groups: before } = useUsageOverview(groupBy, previous, filter);
	const meters = useMeterSeries(groupBy, win, filter);
	const labelFor = useGroupLabeler(groupBy);

	const cached = Math.max(kpis.tokens - kpis.rawInput - kpis.rawOutput, 0);
	const per = (n: number) => (kpis.requests > 0 ? n / kpis.requests : 0);
	const figures: FigureData[] = [
		{
			key: "tokens",
			label: "Tokens",
			value: fmtCompact(kpis.tokens),
			note:
				deltas.hasBaseline && deltas.tokens.ratio != null
					? `${fmtSignedPct(deltas.tokens.ratio)} ${compareLabel}`
					: undefined,
		},
		{
			key: "generated",
			label: "Generated",
			value: fmtCompact(kpis.rawOutput),
			note: `${fmtPct(kpis.tokens > 0 ? kpis.rawOutput / kpis.tokens : 0)} of tokens`,
		},
		{
			key: "cached",
			label: "From cache",
			value: fmtPct(kpis.tokens > 0 ? cached / kpis.tokens : 0),
			note: `${fmtCompact(cached)} tokens`,
		},
		{
			key: "per-request",
			label: "Per request",
			value: fmtCompact(Math.round(per(kpis.tokens))),
			note: `${fmtCompact(Math.round(per(kpis.rawOutput)))} generated`,
		},
	];

	const ranked = [...groups].sort((a, b) => b.tokens - a.tokens);
	const top = Math.max(1, ...ranked.map((g) => g.tokens));
	const previousBy = new Map(before.map((g) => [g.key, g]));
	const rows: ExplorerRow[] = ranked.map((g, i) => {
		const t = g.tokenSplit;
		const fresh = Math.max(t.input - t.cached, 0);
		return {
			key: g.key,
			label: g.key === UNSET_KEY ? "Unassigned" : labelFor(g.key),
			share: g.tokens / top,
			lead: i === 0,
			drillable: g.key !== UNSET_KEY,
			cells: {
				tokens: fmtCompact(g.tokens),
				share: fmtPct(kpis.tokens > 0 ? g.tokens / kpis.tokens : 0),
				input: fmtCompact(fresh),
				output: fmtCompact(t.output),
				cached: fmtPct(t.total > 0 ? t.cached / t.total : 0),
				perRequest: fmtCompact(
					Math.round(g.requests > 0 ? g.tokens / g.requests : 0),
				),
				change: changeText((s) => s.tokens, g, previousBy.get(g.key)),
			},
			sort: {
				tokens: g.tokens,
				share: g.tokens,
				input: fresh,
				output: t.output,
				cached: t.total > 0 ? t.cached / t.total : 0,
				perRequest: g.requests > 0 ? g.tokens / g.requests : 0,
				change: g.tokens - (previousBy.get(g.key)?.tokens ?? 0),
			},
		};
	});

	return { figures, meters, rows };
}
