import { Link } from "@tanstack/react-router";
import {
	Activity,
	Boxes,
	Gauge,
	KeyRound,
	LayoutGrid,
	ScrollText,
} from "lucide-react";
import { Suspense } from "react";
import { useGovernance } from "@/api/hooks/governance";
import type { Policy } from "@/api/types/policy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { resolveMutability } from "@/lib/ownership";
import { ResourceLogs } from "@/logs/ResourceLogs";
import { PolicyAttachedKeys } from "@/policies/PolicyAttachedKeys";
import { PolicyKeysTab } from "@/policies/PolicyKeysTab";
import { PolicyModelsTab } from "@/policies/PolicyModelsTab";
import { PolicyOverviewTab } from "@/policies/PolicyOverviewTab";
import { PolicyRateLimitsTab } from "@/policies/PolicyRateLimitsTab";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { PageLoader } from "@/shared/Spinner";
import { StatusBadge } from "@/shared/StatusBadge";
import { ResourceUsage } from "@/usage/ResourceUsage";

export type PolicyDetailTab =
	| "overview"
	| "models"
	| "keys"
	| "rate-limits"
	| "usage"
	| "logs";

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
	{ value: "logs", label: "Logs", icon: ScrollText },
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
		<div className="flex flex-col gap-5">
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
						<div className="flex flex-col gap-6 pt-2">
							<PolicyOverviewTab policy={policy} />
							<PolicyAttachedKeys policy={policy} />
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
						<ResourceUsage scope="policy_id" id={policy.metadata.id} />
					) : (
						<ComingSoon
							icon={Activity}
							title="Usage"
							body="Save this policy to see its traffic."
						/>
					)}
				</TabsContent>
				<TabsContent value="logs">
					{policy.metadata.id ? (
						<ResourceLogs
							scope="policy_id"
							id={policy.metadata.id}
							label="policy"
						/>
					) : (
						<ComingSoon
							icon={ScrollText}
							title="Logs"
							body="Save this policy to see the requests routed through it."
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
	const gov = useGovernance("policy");
	const { canEdit, canDelete } = resolveMutability(
		policy.metadata.owner?.kind,
		gov,
	);
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0">
				<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
					{displayLabel(policy.metadata)}
					{!hasDisplayName(policy.metadata) && (
						<span className="text-[11px] text-muted-foreground font-normal">
							(no display name)
						</span>
					)}
					<StatusBadge enabled={enabled} />
					{isHostOwned && (
						<span
							className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border"
							title="This policy is owned by a host and managed by Relay."
						>
							Host-owned
						</span>
					)}
				</h1>
				<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
					{name}
				</p>
				{policy.metadata.description && (
					<p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
						{policy.metadata.description}
					</p>
				)}
			</div>
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
		</div>
	);
}

interface ComingSoonProps {
	icon: typeof LayoutGrid;
	title: string;
	body: string;
}

function ComingSoon({ icon: Icon, title, body }: ComingSoonProps) {
	return (
		<div className="mt-4 rounded-md border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
			<Icon
				className="mx-auto w-6 h-6 text-muted-foreground/60 mb-2"
				aria-hidden
			/>
			<div className="text-sm font-medium text-foreground">{title}</div>
			<div className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
				{body}
			</div>
			<div className="mt-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border uppercase tracking-wide">
				Coming soon
			</div>
		</div>
	);
}
