import type { ReactNode } from "react";
import { objectRef } from "@/api/hooks/planIssues";
import type { Policy } from "@/api/types/policy";
import { PlanIssuesPanel } from "@/diagnostics/IssuesPanel";
import { HostLogo, hostRefLogo } from "@/hosts/HostLogo";
import {
	type LinkChoiceRoute,
	LinkChoiceRow,
} from "@/policies/PolicyLinkPicker";
import { budgetLinkShared } from "@/policies/policyFormSpec";
import { POLICY_NO_TRAFFIC, policyWeekScope } from "@/policies/policyWeekUsage";
import { UnpricedUnderBudget } from "@/policies/UnpricedUnderBudget";
import { usePolicyAppliesTo } from "@/policies/usePolicyAppliesTo";
import { usePolicyHosts } from "@/policies/usePolicyHosts";
import {
	type LinkChoice,
	useSelectedBudgets,
	useSelectedPools,
} from "@/policies/usePolicyLinkChoices";
import { usePolicyModels } from "@/policies/usePolicyModels";
import { SharedLinkLabel } from "@/rate-limits/SharedLinkLabel";
import { logoSize } from "@/shared/CatalogIcon";
import { DetailEmpty } from "@/shared/DetailCard";
import { SectionTitle } from "@/shared/SectionTitle";
import { StatCard, StatGrid } from "@/shared/StatCard";
import { WeekFigures } from "@/usage/WeekFigures";

interface Props {
	policy: Policy;
}

export function PolicyOverviewTab({ policy }: Props) {
	return (
		<div className="flex flex-col gap-6">
			<PolicyIssues policy={policy} />

			<UnpricedUnderBudget
				policyRef={policy.metadata.name}
				budgetIds={(policy.spec.budgets ?? []).map((b) => b.budgetId)}
			/>

			<StatsGrid policy={policy} />

			{policy.metadata.id && (
				<WeekFigures
					scope={policyWeekScope(policy.metadata.id)}
					emptyBody={POLICY_NO_TRAFFIC}
				/>
			)}

			<LinksPanel policy={policy} />

			<HostsPanel policy={policy} />
		</div>
	);
}

function LinksPanel({ policy }: { policy: Policy }) {
	const budgetLinks = policy.spec.budgets ?? [];
	const pools = useSelectedPools(policy.spec.poolIds ?? []);
	const budgets = useSelectedBudgets(budgetLinks.map((b) => b.budgetId));
	const appliesTo = usePolicyAppliesTo(policy.metadata.id);
	return (
		<section className="grid gap-4 sm:grid-cols-2">
			<LinkList
				title="Applies to"
				empty={
					appliesTo
						? "No one. Attach it from a team, project or service account page."
						: "Loading…"
				}
				items={appliesTo ?? []}
				linkTo="/accounts/$name"
			/>
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
			<AppliesToStatCard policyId={policy.metadata.id} />
		</StatGrid>
	);
}

function AppliesToStatCard({ policyId }: { policyId: string | undefined }) {
	const appliesTo = usePolicyAppliesTo(policyId);
	if (!appliesTo) {
		return <StatCard label="Applies to" value="…" sub="loading" />;
	}
	return (
		<StatCard
			label="Applies to"
			value={appliesTo.length}
			sub={appliesTo.length === 0 ? "no one: never used" : "accounts"}
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
							<HostLogo host={hostRefLogo(host)} size={logoSize.stacked} />
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

/** The policy's issues and its pools': pool issues don't name the policy. */
function PolicyIssues({ policy }: { policy: Policy }) {
	return (
		<PlanIssuesPanel
			kind="policy"
			id={policy.metadata.id}
			related={(policy.spec.poolIds ?? []).map((id) => objectRef("pool", id))}
		/>
	);
}
