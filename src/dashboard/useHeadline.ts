import { useQuery } from "@tanstack/react-query";
import { useCostKpi, useCostSeries } from "@/api/hooks/cost";
import { keysListQueryOptions } from "@/api/hooks/keys";
import {
	useDailyDistinct,
	useStackedSeries,
	useUsageOverviewWithDeltas,
} from "@/api/hooks/usage";
import type { DeltaResult } from "@/lib/usage-math/delta";
import type { FigureData } from "@/shared/FigureRow";
import {
	fmtCompact,
	fmtMoneyCompact,
	fmtPct,
	fmtSignedPct,
} from "@/usage/format";
import {
	dayTrend,
	pointTotals,
	useDashboardWindow,
} from "./useDashboardWindow";

const HOUR_MS = 3_600_000;

/** The period's headline: spend, traffic, tokens and how many keys sent it,
 * each with one note that says what the number alone can't. */
export function useHeadline(): FigureData[] {
	const dw = useDashboardWindow();
	const { win, hourly } = dw;
	const { kpis, deltas } = useUsageOverviewWithDeltas("source", win);
	const cost = useCostKpi(win);
	const keysByDay = useDailyDistinct("relay_key_hash", win);
	const { data: keyList } = useQuery(keysListQueryOptions);
	const d = deltas.hasBaseline ? deltas : undefined;
	const requestsByHour = useStackedSeries("model_id", hourly, "requests");
	const tokensByHour = useStackedSeries("model_id", hourly, "tokens");
	const spendByHour = useCostSeries("model_id", hourly);

	const vsNote = (delta: DeltaResult | null | undefined) =>
		delta && delta.ratio !== null
			? `${fmtSignedPct(delta.ratio)} ${dw.vs}`
			: undefined;

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
			trend: dayTrend(dw, pointTotals(spendByHour)),
		},
		{
			key: "requests",
			label: "Requests",
			value: fmtCompact(kpis.requests),
			note:
				kpis.errors > 0
					? `${fmtCompact(kpis.errors)} failed (${fmtPct(kpis.errorRate)})`
					: vsNote(d?.requests),
			trend: dayTrend(dw, pointTotals(requestsByHour)),
		},
		{
			key: "tokens",
			label: "Tokens",
			value: fmtCompact(kpis.tokens),
			note:
				kpis.tokens > 0
					? `${fmtPct(cached / kpis.tokens)} served from cache`
					: undefined,
			trend: dayTrend(dw, pointTotals(tokensByHour)),
		},
		{
			key: "keys",
			label: "Active keys",
			value: kpis.activeKeys !== undefined ? fmtCompact(kpis.activeKeys) : "—",
			note:
				issued !== undefined ? `of ${fmtCompact(issued)} issued` : undefined,
			// Distinct counts come per UTC day and can't be summed; a bucket's
			// midday picks its local day, and the larger count wins a shared slice.
			trend: dayTrend(
				dw,
				keysByDay.map((k) => ({
					at: Date.parse(k.bucket) + 12 * HOUR_MS,
					value: k.distinct,
				})),
				Math.max,
			),
		},
	];
}
