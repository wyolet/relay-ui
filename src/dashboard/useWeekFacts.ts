import { useCostKpi } from "@/api/hooks/cost";
import {
	useStackedSeries,
	useUsageOverview,
	useUsageOverviewWithDeltas,
} from "@/api/hooks/usage";
import { daySliceStarts, totalsBySlice } from "@/lib/usage-math/window";
import type { FigureData } from "@/shared/FigureRow";
import { fmtBucket, fmtCompact, fmtMoneyCompact, fmtPct } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import { pointTotals, useDashboardWindow } from "./useDashboardWindow";

/** "Friday 16": a weekday-first date in any locale. */
function fmtWeekday(d: Date): string {
	return `${d.toLocaleDateString(undefined, { weekday: "long" })} ${d.getDate()}`;
}

/** The period's less obvious facts: when it peaked, what a request costs and
 * carries, and how concentrated the traffic is. */
export function useWeekFacts(): FigureData[] {
	const dw = useDashboardWindow();
	const { kpis } = useUsageOverviewWithDeltas("source", dw.win);
	const cost = useCostKpi(dw.win);
	const requestsByHour = useStackedSeries("model_id", dw.hourly, "requests");
	const { groups: models, labels: modelNames } = useUsageOverview(
		"model_id",
		dw.win,
	);
	const { groups: hosts } = useUsageOverview("host_id", dw.win);
	const modelLabel = useGroupLabeler("model_id", modelNames);

	const hourly = pointTotals(requestsByHour);
	const peakHour = hourly.reduce((a, b) => (b.value > a.value ? b : a), {
		at: 0,
		value: 0,
	});
	// Calendar days even for the rolling period: "busiest day" names a date.
	const dayStarts = daySliceStarts(dw.hourly, false);
	const days = totalsBySlice(hourly, dayStarts, dw.nowMs);
	const peakDay = days.reduce<number>(
		(best, v, i) => ((v ?? 0) > (days[best] ?? 0) ? i : best),
		0,
	);
	const peakDayStart = dayStarts[peakDay];
	const perRequest = (n: number) => (kpis.requests > 0 ? n / kpis.requests : 0);
	const topModel = models[0];

	return [
		{
			key: "peak-hour",
			label: "Busiest hour",
			value:
				peakHour.value > 0
					? fmtBucket(new Date(peakHour.at).toISOString(), "1h")
					: "—",
			note: `${fmtCompact(peakHour.value)} requests`,
		},
		{
			key: "peak-day",
			label: "Busiest day",
			value:
				(days[peakDay] ?? 0) > 0 && peakDayStart !== undefined
					? fmtWeekday(new Date(peakDayStart))
					: "—",
			note: `${fmtCompact(days[peakDay] ?? 0)} requests`,
		},
		{
			key: "cost-per-request",
			label: "Cost per request",
			value:
				cost.current.usd != null
					? fmtMoneyCompact(perRequest(cost.current.usd), "USD")
					: "—",
			note:
				cost.current.usd != null
					? `${fmtMoneyCompact(perRequest(cost.current.usd) * 1000, "USD")} per 1K`
					: undefined,
		},
		{
			key: "tokens-per-request",
			label: "Tokens per request",
			value: fmtCompact(Math.round(perRequest(kpis.tokens))),
			note: `${fmtCompact(Math.round(perRequest(kpis.rawOutput)))} generated`,
		},
		{
			key: "models",
			label: "Models in use",
			value: fmtCompact(models.length),
			note: `across ${hosts.length} host${hosts.length === 1 ? "" : "s"}`,
		},
		{
			key: "top-model",
			label: "Top model share",
			value: topModel ? fmtPct(perRequest(topModel.requests)) : "—",
			note: topModel ? modelLabel(topModel.key) : undefined,
		},
	];
}
