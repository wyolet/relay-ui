import { Suspense } from "react";
import { resolveWindow, useUsageOverviewWithDeltas } from "@/api/hooks/usage";
import { CostKpiCard } from "@/usage/CostKpiCard";
import { RANGE_COMPARE_LABELS } from "@/usage/format";
import { UsageStatCards } from "@/usage/UsageStatCards";

/** Top-line traffic KPIs for the dashboard: this week, with week-over-week
 * deltas. Matches the week-scoped traffic chart beside it. */
export function DashboardKpis() {
	const win = resolveWindow("week");
	const { kpis, deltas } = useUsageOverviewWithDeltas("source", win);
	return (
		<UsageStatCards
			kpis={kpis}
			deltas={deltas}
			compareLabel={RANGE_COMPARE_LABELS.week}
			cost={
				// Streams in behind the instant cards (cost needs a host fan-out).
				<Suspense fallback={null}>
					<CostKpiCard win={win} compareLabel={RANGE_COMPARE_LABELS.week} />
				</Suspense>
			}
		/>
	);
}
