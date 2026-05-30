import { Link } from "@tanstack/react-router";
import { useUsageOverview } from "@/api/hooks/usage";
import { UsageStatCards } from "@/usage/UsageStatCards";

/** Top-line traffic KPIs on the dashboard, sourced from /usage/summary. */
export function DashboardTraffic() {
	const { kpis } = useUsageOverview("source");

	return (
		<section>
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Traffic
				</h2>
				<Link
					to="/usage"
					className="text-xs text-muted-foreground hover:text-foreground"
				>
					View usage →
				</Link>
			</div>
			<UsageStatCards kpis={kpis} />
		</section>
	);
}
