import { useSuspenseQueries } from "@tanstack/react-query";
import { useCostKpi } from "@/api/hooks/cost";
import { dayTrends } from "@/lib/usage-math/dayTrends";
import { compareValue, type DeltaResult } from "@/lib/usage-math/delta";
import type { FigureData } from "@/shared/FigureRow";
import {
	fmtCompact,
	fmtMoneyCompact,
	fmtMs,
	fmtPct,
	fmtSignedPct,
} from "@/usage/format";
import {
	useWeekUsageQueries,
	type WeekUsageScope,
} from "@/usage/weekUsageQueries";

const vsNote = (delta: DeltaResult | null) =>
	delta && delta.ratio !== null
		? `${fmtSignedPct(delta.ratio)} vs prior 7 days`
		: undefined;

/** A resource's last 7 days in four figures (spend, requests, p95 latency,
 * error rate), each with a note and, where days add up, a per-day trend. */
export function useWeekFigures(scope: WeekUsageScope): {
	hasTraffic: boolean;
	figures: FigureData[];
} {
	const q = useWeekUsageQueries(scope);
	const [totals, series] = useSuspenseQueries({
		queries: [q.totals, q.series],
	});
	const cost = useCostKpi(q.win, q.filter);
	const row = totals.data.rows?.[0];
	if (!row || row.requests === 0) return { hasTraffic: false, figures: [] };

	const prevRequests = row.previous?.requests ?? 0;
	const trends = dayTrends(series.data.rows ?? [], q.win, Date.parse(q.win.to));
	const { usd, unpricedShare } = cost.current;

	return {
		hasTraffic: true,
		figures: [
			{
				key: "spend",
				label: "Est. spend",
				value: usd != null ? fmtMoneyCompact(usd, "USD") : "—",
				note:
					unpricedShare > 0
						? `${fmtPct(unpricedShare)} of requests unpriced`
						: vsNote(cost.hasBaseline ? cost.delta : null),
				trend: trends.spend,
			},
			{
				key: "requests",
				label: "Requests",
				value: fmtCompact(row.requests),
				note:
					vsNote(
						prevRequests > 0 ? compareValue(row.requests, prevRequests) : null,
					) ?? "last 7 days",
				trend: trends.requests,
			},
			{
				key: "p95",
				label: "p95 latency",
				value: fmtMs(row.duration_ms.p95),
				note: `p50 ${fmtMs(row.duration_ms.p50)}`,
			},
			{
				key: "errors",
				label: "Error rate",
				value: fmtPct(row.error_count / row.requests),
				note:
					row.error_count > 0
						? `${fmtCompact(row.error_count)} failed`
						: "none failed",
				trend: trends.errorRate,
			},
		],
	};
}
