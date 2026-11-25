import type { ReactNode } from "react";
import { objectRef } from "@/api/hooks/planIssues";
import type { Policy } from "@/api/types/policy";
import { PlanIssuesPanel } from "@/diagnostics/IssuesPanel";
import { HostLogo, hostRefLogo } from "@/hosts/HostLogo";
import { cn } from "@/lib/utils";
import {
	type LinkChoiceRoute,
	LinkChoiceRow,
} from "@/policies/PolicyLinkPicker";
import { budgetLinkShared } from "@/policies/policyFormSpec";
import { hostLabel, KEYLESS_HOST_TEXT } from "@/policies/policyReachRows";
import { policyWeekScope } from "@/policies/policyWeekUsage";
import { UnpricedUnderBudget } from "@/policies/UnpricedUnderBudget";
import { usePolicyAppliesTo } from "@/policies/usePolicyAppliesTo";
import { usePolicyHostsByKeyState } from "@/policies/usePolicyHosts";
import {
	type LinkChoice,
	useSelectedBudgets,
	useSelectedPools,
} from "@/policies/usePolicyLinkChoices";
import { usePolicyModelCount } from "@/policies/usePolicyModels";
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
				<WeekFigures scope={policyWeekScope(policy.metadata.id)} />
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
	const modelCount = usePolicyModelCount(policy.metadata.name);
	const hosts = usePolicyHostsByKeyState(policy.metadata.name);
	const breaking = hosts.filter((h) => h.state === "breaking").length;

	return (
		<StatGrid columns={2}>
			<StatCard
				label="Models"
				value={modelCount}
				sub="granted by this policy"
			/>
			<StatCard
				label="Hosts"
				value={hosts.length}
				sub={
					hosts.length === 0
						? "no host resolved"
						: breaking > 0
							? `${breaking} need a key`
							: "serving requests"
				}
			/>
		</StatGrid>
	);
}

function HostsPanel({ policy }: { policy: Policy }) {
	const hosts = usePolicyHostsByKeyState(policy.metadata.name);
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
				{hosts.map(({ row, state }) => {
					const keyCount = row.hostKeys?.length ?? 0;
					return (
						<li key={row.host.id} className="flex items-center gap-3 px-3 py-2">
							<HostLogo host={hostRefLogo(row.host)} size={logoSize.stacked} />
							<div className="flex-1 min-w-0">
								<div className="text-sm text-foreground truncate">
									{hostLabel(row)}
								</div>
								<div
									className={cn(
										"text-[11px] truncate",
										state === "breaking"
											? "text-warning"
											: "text-muted-foreground",
									)}
								>
									{state === "keyed"
										? `${keyCount} credential${keyCount === 1 ? "" : "s"}`
										: KEYLESS_HOST_TEXT[state]}
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
