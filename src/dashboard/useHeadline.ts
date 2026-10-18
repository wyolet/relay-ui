import { useQuery } from "@tanstack/react-query";
import { useCostKpi } from "@/api/hooks/cost";
import { keysListQueryOptions } from "@/api/hooks/keys";
import {
	resolveWindow,
	useUsageOverview,
	useUsageOverviewWithDeltas,
} from "@/api/hooks/usage";
import type { DeltaResult } from "@/lib/usage-math/delta";
import {
	fmtCompact,
	fmtMoneyCompact,
	fmtPct,
	fmtSignedPct,
	RANGE_COMPARE_LABELS,
} from "@/usage/format";

export interface HeadlineFigure {
	key: string;
	label: string;
	value: string;
	note?: string;
}

const VS = RANGE_COMPARE_LABELS.week;

function vsNote(delta: DeltaResult | null | undefined): string | undefined {
	if (!delta || delta.ratio === null) return undefined;
	return `${fmtSignedPct(delta.ratio)} ${VS}`;
}

/** This week's headline: spend, traffic, tokens and how many keys sent it,
 * each with one note that says what the number alone can't. */
export function useHeadline(): HeadlineFigure[] {
	const win = resolveWindow("week");
	const { kpis, deltas } = useUsageOverviewWithDeltas("source", win);
	const cost = useCostKpi(win);
	const { groups: activeKeys } = useUsageOverview("relay_key_hash", win);
	const { data: keyList } = useQuery(keysListQueryOptions);
	const d = deltas.hasBaseline ? deltas : undefined;

	const { usd, unpricedShare } = cost.current;
	const spendNote =
		unpricedShare > 0
			? `${fmtPct(unpricedShare)} of requests unpriced`
			: vsNote(cost.hasBaseline ? cost.delta : null);

	const cached = Math.max(kpis.tokens - kpis.rawInput - kpis.rawOutput, 0);
	const issued = keyList?.items?.length;

	return [
		{
			key: "spend",
			label: "Est. spend",
			value: usd != null ? fmtMoneyCompact(usd, "USD") : "—",
			note: spendNote,
		},
		{
			key: "requests",
			label: "Requests",
			value: fmtCompact(kpis.requests),
			note:
				kpis.errors > 0
					? `${fmtCompact(kpis.errors)} failed (${fmtPct(kpis.errorRate)})`
					: vsNote(d?.requests),
		},
		{
			key: "tokens",
			label: "Tokens",
			value: fmtCompact(kpis.tokens),
			note:
				kpis.tokens > 0
					? `${fmtPct(cached / kpis.tokens)} served from cache`
					: undefined,
		},
		{
			key: "keys",
			label: "Active keys",
			value: fmtCompact(activeKeys.length),
			note:
				issued !== undefined ? `of ${fmtCompact(issued)} issued` : undefined,
		},
	];
}
