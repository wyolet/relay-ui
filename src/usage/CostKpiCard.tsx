import { Banknote } from "lucide-react";
import { useCostKpi } from "@/api/hooks/cost";
import type { UsageWindow } from "@/api/hooks/usage";
import { fmtMoneyCompact, fmtPct } from "./format";
import { deltaChip, StatCard } from "./UsageStatCards";

/**
 * Estimated spend over the window, with a period-over-period delta. Reads the
 * server-stamped cost off the ungrouped totals row plus one extra query for
 * the comparison window — mount behind its own Suspense so the instant KPI
 * cards never wait on it.
 */
export function CostKpiCard({
	win,
	compareLabel,
}: {
	win: UsageWindow;
	compareLabel?: string;
}) {
	const kpi = useCostKpi(win);
	const { usd, unpricedEvents, unpricedShare } = kpi.current;

	let hint: string | undefined;
	if (usd == null) {
		hint = unpricedEvents > 0 ? "No pricing configured" : undefined;
	} else if (unpricedShare > 0) {
		hint = `${fmtPct(unpricedShare)} of requests unpriced`;
	}

	return (
		<StatCard
			icon={Banknote}
			label="Est. spend"
			value={usd != null ? `≈${fmtMoneyCompact(usd, "USD")}` : "—"}
			hint={hint}
			delta={
				kpi.delta && kpi.hasBaseline
					? deltaChip(kpi.delta, "pct", "neutral", compareLabel)
					: undefined
			}
		/>
	);
}
