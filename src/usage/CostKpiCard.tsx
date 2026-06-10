import { Banknote } from "lucide-react";
import { useCostKpi } from "@/api/hooks/cost";
import type { UsageWindow } from "@/api/hooks/usage";
import { fmtMoneyCompact, fmtPct } from "./format";
import { deltaChip, StatCard } from "./UsageStatCards";

/**
 * Estimated spend over the window, with a period-over-period delta. Data comes
 * from the per-host cost fan-out (see api/hooks/cost.ts), so mount this behind
 * its own Suspense — it must never block the instant KPI cards.
 */
export function CostKpiCard({
	win,
	compareLabel,
}: {
	win: UsageWindow;
	compareLabel?: string;
}) {
	const kpi = useCostKpi(win);
	const dominant = kpi.current.dominant;

	let hint: string | undefined;
	if (dominant == null) {
		hint = kpi.current.unpricedTokens > 0 ? "No pricing configured" : undefined;
	} else if (kpi.current.mixed) {
		hint = "+ other currencies";
	} else if (kpi.unpricedShare > 0) {
		hint = `${fmtPct(kpi.unpricedShare)} of tokens unpriced`;
	} else if (kpi.hostsTruncated) {
		hint = "partial — too many hosts";
	}

	return (
		<StatCard
			icon={Banknote}
			label="Est. spend"
			value={
				dominant
					? `≈${fmtMoneyCompact(dominant.amount, dominant.currency)}`
					: "—"
			}
			hint={hint}
			delta={
				kpi.delta && kpi.hasBaseline
					? deltaChip(kpi.delta, "pct", "neutral", compareLabel)
					: undefined
			}
		/>
	);
}
