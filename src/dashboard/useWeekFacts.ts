import { useCostKpi } from "@/api/hooks/cost";
import {
	resolveWindow,
	useStackedSeries,
	useUsageOverview,
	useUsageOverviewWithDeltas,
} from "@/api/hooks/usage";
import type { FigureData } from "@/shared/FigureRow";
import { fmtBucket, fmtCompact, fmtMoney, fmtPct } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import { dailyTotals, weekByHour } from "./useWeekActivity";

const DAY_NAMES = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

/** The week's less obvious facts: when it peaked, what a request costs and
 * carries, and how concentrated the traffic is. */
export function useWeekFacts(): FigureData[] {
	const win = resolveWindow("week");
	const { kpis } = useUsageOverviewWithDeltas("source", win);
	const cost = useCostKpi(win);
	const { points, series } = useStackedSeries(
		"model_id",
		weekByHour(),
		"requests",
	);
	const { groups: models } = useUsageOverview("model_id", win);
	const { groups: hosts } = useUsageOverview("host_id", win);
	const modelLabel = useGroupLabeler("model_id");

	const hourly = points.map((p) => ({
		bucket: p.bucket,
		total: series.reduce((sum, k) => sum + Number(p[k] ?? 0), 0),
	}));
	const peakHour = hourly.reduce((a, b) => (b.total > a.total ? b : a), {
		bucket: "",
		total: 0,
	});
	const days = dailyTotals(points, series);
	const peakDay = days.reduce<number>(
		(best, v, i) => ((v ?? 0) > (days[best] ?? 0) ? i : best),
		0,
	);
	const perRequest = (n: number) => (kpis.requests > 0 ? n / kpis.requests : 0);
	const topModel = models[0];

	return [
		{
			key: "peak-hour",
			label: "Busiest hour",
			value: peakHour.total > 0 ? fmtBucket(peakHour.bucket, "1h") : "—",
			note: `${fmtCompact(peakHour.total)} requests`,
		},
		{
			key: "peak-day",
			label: "Busiest day",
			value: (days[peakDay] ?? 0) > 0 ? (DAY_NAMES[peakDay] ?? "—") : "—",
			note: `${fmtCompact(days[peakDay] ?? 0)} requests`,
		},
		{
			key: "cost-per-request",
			label: "Cost per request",
			value:
				cost.current.usd != null
					? fmtMoney(perRequest(cost.current.usd), "USD")
					: "—",
			note:
				cost.current.usd != null
					? `${fmtMoney(perRequest(cost.current.usd) * 1000, "USD")} per 1K`
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
