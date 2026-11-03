import { Suspense } from "react";
import type { Host } from "@/api/types/host";
import { PlanIssuesPanel } from "@/diagnostics/IssuesPanel";
import { useHostOverview } from "@/hosts/useHostOverview";
import { useHostUsage } from "@/hosts/useHostUsage";
import { StatCard, StatGrid } from "@/shared/StatCard";
import {
	ResourceSpendCard,
	ResourceSpendCardSkeleton,
} from "@/usage/ResourceSpendCard";
import {
	ResourceUsageCards,
	UsageCardsSkeleton,
} from "@/usage/ResourceUsageCards";

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
				{host.metadata.id && (
					<>
						<Suspense fallback={<UsageCardsSkeleton />}>
							<HostUsageCards hostId={host.metadata.id} />
						</Suspense>
						<Suspense fallback={<ResourceSpendCardSkeleton />}>
							<ResourceSpendCard dimension="host_id" id={host.metadata.id} />
						</Suspense>
					</>
				)}
			</StatGrid>
		</div>
	);
}

function HostUsageCards({ hostId }: { hostId: string }) {
	const usage = useHostUsage(hostId);
	return <ResourceUsageCards usage={usage} />;
}
