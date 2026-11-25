import { Link } from "@tanstack/react-router";
import {
	Activity,
	Boxes,
	Gauge,
	KeyRound,
	LayoutGrid,
	ShieldCheck,
} from "lucide-react";
import { Suspense } from "react";
import type { Policy } from "@/api/types/policy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutability } from "@/hooks/useMutability";
import { PolicyKeysTab } from "@/policies/PolicyKeysTab";
import { PolicyModelsTab } from "@/policies/PolicyModelsTab";
import { PolicyOverviewTab } from "@/policies/PolicyOverviewTab";
import { PolicyRateLimitsTab } from "@/policies/PolicyRateLimitsTab";
import { POLICY_NO_TRAFFIC, policyWeekScope } from "@/policies/policyWeekUsage";
import { BackLink } from "@/shared/BackLink";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { PageLoader } from "@/shared/Spinner";
import {
	CatalogDetachedBadge,
	OwnerBadge,
	StatusBadge,
} from "@/shared/StatusBadge";
import { WeekUsage } from "@/usage/WeekUsage";

export type PolicyDetailTab =
	| "overview"
	| "models"
	| "keys"
	| "rate-limits"
	| "usage";

interface Props {
	policy: Policy;
	tab: PolicyDetailTab;
	onTabChange: (next: PolicyDetailTab) => void;
	onDelete: () => void;
	onToggleEnabled: () => void;
	deleting?: boolean;
	toggling?: boolean;
}

const TABS: {
	value: PolicyDetailTab;
	label: string;
	icon: typeof LayoutGrid;
}[] = [
	{ value: "overview", label: "Overview", icon: LayoutGrid },
	{ value: "models", label: "Models", icon: Boxes },
	{ value: "keys", label: "Credentials", icon: KeyRound },
	{ value: "rate-limits", label: "Rate limits", icon: Gauge },
	{ value: "usage", label: "Usage", icon: Activity },
];

export function PolicyDetailView({
	policy,
	tab,
	onTabChange,
	onDelete,
	onToggleEnabled,
	deleting,
	toggling,
}: Props) {
	const enabled = policy.spec.enabled !== false;

	return (
		<div>
			<Header
				policy={policy}
				enabled={enabled}
				onDelete={onDelete}
				onToggleEnabled={onToggleEnabled}
				deleting={deleting}
				toggling={toggling}
			/>

			<Tabs
				value={tab}
				onValueChange={(v) => onTabChange((v ?? "overview") as PolicyDetailTab)}
			>
				<TabsList variant="underline">
					{TABS.map(({ value, label, icon: Icon }) => (
						<TabsTrigger key={value} value={value} className="px-3 h-9">
							<Icon className="w-3.5 h-3.5" aria-hidden />
							{label}
						</TabsTrigger>
					))}
				</TabsList>

				<TabsContent value="overview">
					<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
						<div className="pt-2">
							<PolicyOverviewTab policy={policy} />
						</div>
					</Suspense>
				</TabsContent>
				<TabsContent value="models">
					<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
						<PolicyModelsTab policy={policy} />
					</Suspense>
				</TabsContent>
				<TabsContent value="keys">
					<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
						<PolicyKeysTab policy={policy} />
					</Suspense>
				</TabsContent>
				<TabsContent value="rate-limits">
					<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
						<PolicyRateLimitsTab policy={policy} />
					</Suspense>
				</TabsContent>
				<TabsContent value="usage">
					{policy.metadata.id ? (
						<div className="pt-2">
							<WeekUsage
								scope={policyWeekScope(policy.metadata.id)}
								emptyBody={POLICY_NO_TRAFFIC}
							/>
						</div>
					) : (
						<EmptyState
							icon={Activity}
							title="Usage"
							body="Save this policy to see its traffic."
							comingSoon
						/>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}

interface HeaderProps {
	policy: Policy;
	enabled: boolean;
	onDelete: () => void;
	onToggleEnabled: () => void;
	deleting?: boolean;
	toggling?: boolean;
}

function Header({
	policy,
	enabled,
	onDelete,
	onToggleEnabled,
	deleting,
	toggling,
}: HeaderProps) {
	const name = policy.metadata.name;
	const isHostOwned = policy.metadata.owner?.kind === "host";
	const { canEdit, canDelete } = useMutability(policy.metadata, "policy");
	return (
		<DetailPageHeader
			back={<BackLink to="/policies">Policies</BackLink>}
			icon={ShieldCheck}
			metadata={policy.metadata}
			badges={
				<>
					<StatusBadge enabled={enabled} />
					{isHostOwned && (
						<OwnerBadge
							label="Host"
							title="This policy is owned by a host and managed by Relay."
						/>
					)}
					<CatalogDetachedBadge
						detachedAt={policy.metadata.catalogDetachedAt}
					/>
				</>
			}
		>
			<DetailHeaderActions
				enabled={enabled}
				onToggle={onToggleEnabled}
				toggling={toggling}
				showToggle={canEdit}
				showDelete={canDelete}
				onDelete={onDelete}
				deleting={deleting}
				editLink={
					canEdit
						? ({ className, content }) => (
								<Link
									to="/policies/$name/edit"
									params={{ name }}
									className={className}
								>
									{content}
								</Link>
							)
						: undefined
				}
			/>
		</DetailPageHeader>
	);
}
