import { Link } from "@tanstack/react-router";
import {
	Activity,
	Boxes,
	Gauge,
	KeyRound,
	LayoutGrid,
	Pencil,
	Power,
	ScrollText,
	Trash2,
} from "lucide-react";
import type { Policy } from "@/api/types/policy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { ResourceLogs } from "@/logs/ResourceLogs";
import { PolicyAttachedRelayKeys } from "@/policies/PolicyAttachedRelayKeys";
import { PolicyKeysTab } from "@/policies/PolicyKeysTab";
import { PolicyModelsTab } from "@/policies/PolicyModelsTab";
import { PolicyOverviewTab } from "@/policies/PolicyOverviewTab";
import { PolicyRateLimitsTab } from "@/policies/PolicyRateLimitsTab";
import { useAllowEdit } from "@/stores/permissions";

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
	{ value: "keys", label: "Host keys", icon: KeyRound },
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
					<div className="flex flex-col gap-6 pt-2">
						<PolicyOverviewTab policy={policy} />
						<PolicyAttachedRelayKeys policy={policy} />
					</div>
				</TabsContent>
				<TabsContent value="models">
					<PolicyModelsTab policy={policy} />
				</TabsContent>
				<TabsContent value="keys">
					<PolicyKeysTab policy={policy} />
				</TabsContent>
				<TabsContent value="rate-limits">
					<PolicyRateLimitsTab policy={policy} />
				</TabsContent>
				<TabsContent value="usage">
					<ComingSoon
						icon={Activity}
						title="Usage"
						body="Aggregate token, request, and cost counters for this policy. Pending the /admin/metrics endpoint."
					/>
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
	const allowHostOwnedEdits = useAllowEdit("host-owned-policies");
	const canMutate = !isHostOwned || allowHostOwnedEdits;
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
			<div className="flex items-center gap-2 shrink-0">
				{canMutate && (
					<button
						type="button"
						onClick={onToggleEnabled}
						disabled={toggling}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-foreground border border-border hover:bg-muted disabled:opacity-50 transition-colors"
					>
						<Power className="w-3.5 h-3.5" />
						{enabled ? "Disable" : "Enable"}
					</button>
				)}
				{canMutate && (
					<>
						<Link
							to="/policies/$name/edit"
							params={{ name }}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-foreground border border-border hover:bg-muted transition-colors"
						>
							<Pencil className="w-3.5 h-3.5" />
							Edit
						</Link>
						<button
							type="button"
							onClick={onDelete}
							disabled={deleting}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-destructive border border-border hover:bg-destructive/10 disabled:opacity-50 transition-colors"
						>
							<Trash2 className="w-3.5 h-3.5" />
							Delete
						</button>
					</>
				)}
			</div>
		</div>
	);
}

function StatusBadge({ enabled }: { enabled: boolean }) {
	return enabled ? (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
			Enabled
		</span>
	) : (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
			Disabled
		</span>
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
