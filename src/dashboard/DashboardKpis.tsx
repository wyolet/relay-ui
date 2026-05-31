import { useUsageOverview } from "@/api/hooks/usage";
import { UsageStatCards } from "@/usage/UsageStatCards";

/** Top-line traffic KPIs for the dashboard, sourced from /usage/summary. */
export function DashboardKpis() {
	const { kpis } = useUsageOverview("source");
	return <UsageStatCards kpis={kpis} />;
}
