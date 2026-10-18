import { useCostKpi, useCostSeries } from "@/api/hooks/cost";
import {
	type ResolvedWindow,
	type UsageGroupBy,
	type UsageSummaryFilter,
	useUsageOverviewWithDeltas,
} from "@/api/hooks/usage";
import type { FigureData } from "@/shared/FigureRow";
import {
	fmtCompact,
	fmtMoney,
	fmtMoneyCompact,
	fmtPct,
	fmtSignedPct,
	RANGE_COMPARE_LABELS,
} from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import type { ExplorerColumn, ExplorerRow } from "./ExplorerTable";
import { changeText, UNSET_KEY } from "./lensRows";

export const SPEND_COLUMNS: ExplorerColumn[] = [
	{ key: "spend", label: "Spend" },
	{ key: "share", label: "Of total" },
	{ key: "perRequest", label: "Per request" },
	{ key: "perMTokens", label: "Per 1M tokens" },
	{ key: "requests", label: "Requests" },
	{ key: "unpriced", label: "Unpriced" },
	{ key: "change", label: "vs previous" },
];

const usd = (n: number) => fmtMoney(n, "USD");

/** Estimated spend in the explorer's slice: total, unit costs, what's left
 * unpriced, split by the group-by. */
export function useSpendLens(
	groupBy: UsageGroupBy,
	win: ResolvedWindow,
	filter: UsageSummaryFilter,
	compareLabel: string = RANGE_COMPARE_LABELS.custom,
) {
	const cost = useCostKpi(win, filter);
	const {
		kpis,
		groups,
		previousGroups: before,
	} = useUsageOverviewWithDeltas(groupBy, win, filter);
	const series = useCostSeries(groupBy, win, filter);
	const labelFor = useGroupLabeler(groupBy);

	const total = cost.current.usd;
	const figures: FigureData[] = [
		{
			key: "spend",
			label: "Est. spend",
			value: total != null ? fmtMoneyCompact(total, "USD") : "—",
			note:
				cost.hasBaseline && cost.delta?.ratio != null
					? `${fmtSignedPct(cost.delta.ratio)} ${compareLabel}`
					: undefined,
		},
		{
			key: "per-request",
			label: "Per request",
			value:
				total != null && kpis.requests > 0 ? usd(total / kpis.requests) : "—",
			note:
				total != null && kpis.requests > 0
					? `${usd((total / kpis.requests) * 1000)} per 1K`
					: undefined,
		},
		{
			key: "per-m-tokens",
			label: "Per 1M tokens",
			value:
				total != null && kpis.tokens > 0
					? usd((total / kpis.tokens) * 1e6)
					: "—",
			note: `${fmtCompact(kpis.tokens)} tokens`,
		},
		{
			key: "unpriced",
			label: "Unpriced",
			value: fmtPct(cost.current.unpricedShare),
			note: `${fmtCompact(cost.current.unpricedEvents)} requests`,
		},
	];

	const spendOf = (g: { cost: { usd: number | null } }) => g.cost.usd ?? 0;
	const ranked = [...groups].sort((a, b) => spendOf(b) - spendOf(a));
	const top = Math.max(1e-9, ...ranked.map(spendOf));
	const previousBy = new Map(before.map((g) => [g.key, g]));
	const rows: ExplorerRow[] = ranked.map((g, i) => ({
		key: g.key,
		label: g.key === UNSET_KEY ? "Unassigned" : labelFor(g.key),
		share: spendOf(g) / top,
		lead: i === 0,
		drillable: g.key !== UNSET_KEY,
		cells: {
			spend: g.cost.usd != null ? fmtMoneyCompact(g.cost.usd, "USD") : "—",
			share: total ? fmtPct(spendOf(g) / total) : "—",
			perRequest:
				g.cost.usd != null && g.requests > 0
					? usd(g.cost.usd / g.requests)
					: "—",
			perMTokens:
				g.cost.usd != null && g.tokens > 0
					? usd((g.cost.usd / g.tokens) * 1e6)
					: "—",
			requests: fmtCompact(g.requests),
			unpriced: g.cost.unpricedEvents > 0 ? fmtPct(g.cost.unpricedShare) : "—",
			change: changeText(spendOf, g, previousBy.get(g.key)),
		},
		sort: {
			spend: spendOf(g),
			share: spendOf(g),
			perRequest: g.requests > 0 ? spendOf(g) / g.requests : 0,
			perMTokens: g.tokens > 0 ? spendOf(g) / g.tokens : 0,
			requests: g.requests,
			unpriced: g.cost.unpricedShare,
			change: spendOf(g) - spendOf(previousBy.get(g.key) ?? g),
		},
	}));

	return { figures, series, rows, unpriced: series.unpriced };
}
