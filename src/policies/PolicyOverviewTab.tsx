import { type ReactNode, Suspense } from "react";
import { usePolicyReferences } from "@/api/hooks/policies";
import type { Policy } from "@/api/types/policy";
import { IssuesPanel } from "@/diagnostics/IssuesPanel";
import { usePolicyDiagnostics } from "@/diagnostics/useDiagnostics";
import { HostLogo, hostRefLogo } from "@/hosts/HostLogo";
import {
	type LinkChoiceRoute,
	LinkChoiceRow,
} from "@/policies/PolicyLinkPicker";
import { budgetLinkShared } from "@/policies/policyFormSpec";
import { usePolicyHosts } from "@/policies/usePolicyHosts";
import {
	type LinkChoice,
	useSelectedBudgets,
	useSelectedPools,
} from "@/policies/usePolicyLinkChoices";
import { usePolicyModels } from "@/policies/usePolicyModels";
import { usePolicyUsage } from "@/policies/usePolicyUsage";
import { SharedLinkLabel } from "@/rate-limits/SharedLinkLabel";
import { DetailEmpty } from "@/shared/DetailCard";
import { SectionTitle } from "@/shared/SectionTitle";
import { StatCard, StatGrid } from "@/shared/StatCard";
import {
	ResourceSpendCard,
	ResourceSpendCardSkeleton,
} from "@/usage/ResourceSpendCard";
import {
	ResourceUsageCards,
	UsageCardsSkeleton,
} from "@/usage/ResourceUsageCards";

interface Props {
	policy: Policy;
}

export function PolicyOverviewTab({ policy }: Props) {
	return (
		<div className="flex flex-col gap-6">
			<PolicyIssues policyId={policy.metadata.id} />

			<StatsGrid policy={policy} />

			<LinksPanel policy={policy} />

			<HostsPanel policy={policy} />
		</div>
	);
}

function LinksPanel({ policy }: { policy: Policy }) {
	const budgetLinks = policy.spec.budgets ?? [];
	const pools = useSelectedPools(policy.spec.poolIds ?? []);
	const budgets = useSelectedBudgets(budgetLinks.map((b) => b.budgetId));
	return (
		<section className="grid gap-4 sm:grid-cols-2">
			<LinkList
				title="Pools, in failover order"
				empty="No pools linked."
				items={pools}
				linkTo="/pools/$name"
				ordered
			/>
			<LinkList
				title="Budgets"
				empty="No budgets linked."
				items={budgets}
				linkTo="/policies/budgets/$name"
				renderTrailing={(c) => (
					<SharedLinkLabel shared={budgetLinkShared(budgetLinks, c.id)} />
				)}
			/>
		</section>
	);
}

function LinkList({
	title,
	empty,
	items,
	linkTo,
	ordered,
	renderTrailing,
}: {
	title: string;
	empty: string;
	items: LinkChoice[];
	linkTo: LinkChoiceRoute;
	ordered?: boolean;
	renderTrailing?: (choice: LinkChoice) => ReactNode;
}) {
	return (
		<div>
			<SectionTitle>{title}</SectionTitle>
			{items.length === 0 ? (
				<DetailEmpty>{empty}</DetailEmpty>
			) : (
				<ul className="divide-y divide-border rounded-md border border-border">
					{items.map((c, i) => (
						<LinkChoiceRow
							key={c.id}
							choice={c}
							linkTo={linkTo}
							rank={ordered ? i + 1 : undefined}
						>
							{renderTrailing?.(c)}
						</LinkChoiceRow>
					))}
				</ul>
			)}
		</div>
	);
}

function StatsGrid({ policy }: { policy: Policy }) {
	const models = usePolicyModels(policy.metadata.name);
	const hosts = usePolicyHosts(policy.metadata.name);

	return (
		<StatGrid title="Overview">
			<StatCard
				label="Models"
				value={models.length}
				sub="granted by this policy"
			/>
			<StatCard
				label="Hosts"
				value={hosts.length}
				sub={hosts.length === 0 ? "no host resolved" : "serving requests"}
			/>
			{policy.metadata.id ? (
				<Suspense
					fallback={<StatCard label="Bindings" value="…" sub="loading" />}
				>
					<BindingStatCard policyId={policy.metadata.id} />
				</Suspense>
			) : (
				<StatCard label="Bindings" value="—" sub="unsaved" />
			)}
			{policy.metadata.id && (
				<>
					<Suspense fallback={<UsageCardsSkeleton />}>
						<PolicyUsageCards policyId={policy.metadata.id} />
					</Suspense>
					<Suspense fallback={<ResourceSpendCardSkeleton />}>
						<ResourceSpendCard dimension="policy_id" id={policy.metadata.id} />
					</Suspense>
				</>
			)}
		</StatGrid>
	);
}

function BindingStatCard({ policyId }: { policyId: string }) {
	const { data } = usePolicyReferences(policyId);
	const count = (data.items ?? []).filter(
		(r) => r.kind === "policy-binding" && r.via === "spec.policyId",
	).length;
	return (
		<StatCard
			label="Bindings"
			value={count}
			sub={count === 0 ? "not bound" : "applying this policy"}
		/>
	);
}

function HostsPanel({ policy }: { policy: Policy }) {
	const hosts = usePolicyHosts(policy.metadata.name);
	if (hosts.length === 0) {
		return (
			<section>
				<SectionTitle>Hosts</SectionTitle>
				<DetailEmpty>
					No hosts resolved: link pools that serve this policy's models.
				</DetailEmpty>
			</section>
		);
	}
	return (
		<section>
			<SectionTitle>Hosts in this policy</SectionTitle>
			<ul className="divide-y divide-border rounded-md border border-border">
				{hosts.map(({ host, hostKeys }) => {
					const keyCount = hostKeys?.length ?? 0;
					return (
						<li key={host.id} className="flex items-center gap-3 px-3 py-2">
							<HostLogo host={hostRefLogo(host)} size={22} />
							<div className="flex-1 min-w-0">
								<div className="text-sm text-foreground truncate">
									{host.displayName?.trim() || host.name}
								</div>
								<div className="text-[11px] text-muted-foreground truncate">
									{keyCount === 0
										? "no credential — requests will fail"
										: `${keyCount} credential${keyCount === 1 ? "" : "s"}`}
								</div>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

function PolicyUsageCards({ policyId }: { policyId: string }) {
	const usage = usePolicyUsage(policyId);
	return <ResourceUsageCards usage={usage} />;
}

function PolicyIssues({ policyId }: { policyId: string | undefined }) {
	const diagnostics = usePolicyDiagnostics(policyId);
	return <IssuesPanel diagnostics={diagnostics} />;
}
