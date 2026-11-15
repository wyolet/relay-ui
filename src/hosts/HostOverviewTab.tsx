import type { Host } from "@/api/types/host";
import { PlanIssuesPanel } from "@/diagnostics/IssuesPanel";
import { HOST_NO_TRAFFIC, hostWeekScope } from "@/hosts/hostWeekUsage";
import { useHostOverview } from "@/hosts/useHostOverview";
import { StatCard, StatGrid } from "@/shared/StatCard";
import { WeekFigures } from "@/usage/WeekFigures";

export function HostOverviewTab({ host }: { host: Host }) {
	const counts = useHostOverview(host);

	return (
		<div className="flex flex-col gap-6 pt-2">
			<PlanIssuesPanel kind="host" id={host.metadata.id} />
			<StatGrid title="Overview">
				<StatCard
					label="Models"
					value={counts.models}
					sub={`${counts.enabledModels} enabled`}
				/>
				<StatCard
					label="Credentials"
					value={counts.credentials}
					sub={`${counts.enabledCredentials} enabled`}
				/>
				<StatCard
					label="Tier presets"
					value={counts.tierPresets}
					sub={counts.tierPresets === 0 ? "none" : "bind to accounts"}
				/>
				<StatCard
					label="User policies"
					value={counts.userPolicies}
					sub={counts.userPolicies === 0 ? "unused" : "link its credentials"}
				/>
			</StatGrid>
			{host.metadata.id && (
				<WeekFigures
					scope={hostWeekScope(host.metadata.id)}
					emptyBody={HOST_NO_TRAFFIC}
				/>
			)}
		</div>
	);
}
