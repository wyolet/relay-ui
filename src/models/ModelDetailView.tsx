import { Link } from "@tanstack/react-router";
import {
	Activity,
	AlertTriangle,
	BookOpen,
	Boxes,
	Braces,
	Brain,
	CalendarDays,
	DollarSign,
	Eye,
	FileText,
	GitBranch,
	Globe,
	History,
	Image as ImageIcon,
	KeyRound,
	Layers,
	LayoutGrid,
	ListOrdered,
	ListTree,
	type LucideIcon,
	MessageSquare,
	Mic,
	Monitor,
	Paperclip,
	Power,
	Radio,
	Scale,
	ScrollText,
	Server,
	Settings2,
	ShieldCheck,
	Trash2,
	TrendingDown,
	Volume2,
	Wrench,
	Zap,
} from "lucide-react";
import { Suspense, useMemo } from "react";
import { useGovernance } from "@/api/hooks/governance";
import { useHosts } from "@/api/hooks/hosts";
import type { ModelHostView, ModelPolicyView } from "@/api/hooks/models";
import type { Host } from "@/api/types/host";
import type { Model, ModelCapabilities } from "@/api/types/model";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useModelDiagnostics } from "@/diagnostics/useDiagnostics";
import { HostCell } from "@/hosts/HostCell";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { resolveMutability } from "@/lib/ownership";
import { blendedRequestCost } from "@/lib/usage-math/pricing";
import { ResourceLogs } from "@/logs/ResourceLogs";
import type { BindingUsage } from "@/models/useModelHostSpend";
import { useModelHostSpend } from "@/models/useModelHostSpend";
import { useModelHosts } from "@/models/useModelHosts";
import { useModelPolicies } from "@/models/useModelPolicies";
import {
	type ModelProvider,
	useModelProvider,
} from "@/models/useModelProvider";
import { useModelUsage } from "@/models/useModelUsage";
import { fmtCost, MeterGrid } from "@/pricing/MeterGrid";
import { ProviderLogo } from "@/providers/ProviderLogo";
import {
	ResourceUsageCards,
	UsageCardsSkeleton,
} from "@/usage/ResourceUsageCards";
import {
	ResourceSpendCard,
	ResourceSpendCardSkeleton,
} from "@/usage/ResourceSpendCard";
import { ResourceUsage } from "@/usage/ResourceUsage";

export type ModelDetailTab =
	| "overview"
	| "hosts"
	| "policies"
	| "limits"
	| "pricing"
	| "usage"
	| "logs";

interface Props {
	model: Model;
	tab: ModelDetailTab;
	onTabChange: (next: ModelDetailTab) => void;
	onToggleEnabled: () => void;
	onDelete?: () => void;
	toggling?: boolean;
	deleting?: boolean;
}

const TABS: {
	value: ModelDetailTab;
	label: string;
	icon: typeof LayoutGrid;
}[] = [
	{ value: "overview", label: "Overview", icon: LayoutGrid },
	{ value: "hosts", label: "Hosts", icon: Server },
	{ value: "policies", label: "Policies", icon: ShieldCheck },
	{ value: "limits", label: "Limits", icon: Settings2 },
	{ value: "pricing", label: "Pricing", icon: DollarSign },
	{ value: "usage", label: "Usage", icon: Activity },
	{ value: "logs", label: "Logs", icon: ScrollText },
];

export function ModelDetailView({
	model,
	tab,
	onTabChange,
	onToggleEnabled,
	onDelete,
	toggling,
	deleting,
}: Props) {
	const provider = useModelProvider(model);
	const hostRows = useModelHosts(model.metadata.name);
	const policyRows = useModelPolicies(model.metadata.name);
	const { data: hostsData } = useHosts();
	const hostById = useMemo(() => {
		const m = new Map<string, Host>();
		for (const h of hostsData.items ?? []) {
			if (h.metadata.id) m.set(h.metadata.id, h);
		}
		return m;
	}, [hostsData]);

	return (
		<div className="flex flex-col gap-5">
			<Header
				model={model}
				provider={provider}
				onToggleEnabled={onToggleEnabled}
				onDelete={onDelete}
				toggling={toggling}
				deleting={deleting}
			/>

			<Tabs
				value={tab}
				onValueChange={(v) => onTabChange((v ?? "overview") as ModelDetailTab)}
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
					<OverviewTab
						model={model}
						hostRows={hostRows}
						policyRows={policyRows}
					/>
				</TabsContent>
				<TabsContent value="hosts">
					<HostsTab rows={hostRows} hostById={hostById} />
				</TabsContent>
				<TabsContent value="policies">
					<PoliciesTab rows={policyRows} />
				</TabsContent>
				<TabsContent value="limits">
					<LimitsTab model={model} />
				</TabsContent>
				<TabsContent value="pricing">
					<PricingTab model={model} hostRows={hostRows} hostById={hostById} />
				</TabsContent>
				<TabsContent value="usage">
					{model.metadata.id ? (
						<ResourceUsage scope="model_id" id={model.metadata.id} />
					) : (
						<ComingSoon
							icon={Activity}
							title="Usage"
							body="Save this model to see its traffic."
						/>
					)}
				</TabsContent>
				<TabsContent value="logs">
					{model.metadata.id ? (
						<ResourceLogs
							scope="model_id"
							id={model.metadata.id}
							label="model"
						/>
					) : (
						<ComingSoon
							icon={ScrollText}
							title="Logs"
							body="Save this model to see the inference requests targeting it."
						/>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}

/* ---------------- Header ---------------- */

function Header({
	model,
	provider,
	onToggleEnabled,
	onDelete,
	toggling,
	deleting,
}: {
	model: Model;
	provider: ModelProvider;
	onToggleEnabled: () => void;
	onDelete?: () => void;
	toggling?: boolean;
	deleting?: boolean;
}) {
	const enabled = model.spec.enabled !== false;
	const isProviderOwned = model.metadata.owner?.kind === "provider";
	const gov = useGovernance("model");
	const { canEdit, canDelete } = resolveMutability(
		model.metadata.owner?.kind,
		gov,
	);
	const dep = deprecationNote(model);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					{provider.provider ? (
						<ProviderLogo
							provider={provider.provider}
							size={36}
							className="mt-0.5 shrink-0"
						/>
					) : (
						<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center">
							<Boxes className="w-4 h-4 text-muted-foreground" aria-hidden />
						</div>
					)}
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2 flex-wrap">
							{displayLabel(model.metadata)}
							{!hasDisplayName(model.metadata) && (
								<span className="text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
							<StatusBadge enabled={enabled} />
							{isProviderOwned && <OwnerBadge label="Provider" />}
							{dep && (
								<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-warning/10 text-warning border border-warning/30">
									<AlertTriangle className="w-3 h-3" />
									Deprecated
								</span>
							)}
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{model.metadata.name}
						</p>
						<p className="mt-0.5 text-[11px] text-muted-foreground">
							{provider.providerSlug && (
								<>
									by{" "}
									<Link
										to="/providers/$name"
										params={{ name: provider.providerSlug }}
										className="text-foreground hover:underline"
									>
										{provider.provider
											? displayLabel(provider.provider.metadata)
											: provider.providerSlug}
									</Link>
								</>
							)}
							{model.spec.family && (
								<>
									{provider.providerSlug && (
										<span className="text-muted-foreground/50"> · </span>
									)}
									family{" "}
									<span className="text-foreground">{model.spec.family}</span>
									{model.spec.version && (
										<span className="text-foreground">
											{" "}
											{model.spec.version}
										</span>
									)}
								</>
							)}
						</p>
						{model.metadata.description && (
							<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
								{model.metadata.description}
							</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{canEdit && (
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
					{canDelete && onDelete && (
						<button
							type="button"
							onClick={onDelete}
							disabled={deleting}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-destructive border border-border hover:bg-destructive/10 disabled:opacity-50 transition-colors"
						>
							<Trash2 className="w-3.5 h-3.5" />
							Delete
						</button>
					)}
				</div>
			</div>
			{dep && (
				<div className="flex items-start gap-2 px-3 py-2 rounded-md border border-warning/30 bg-warning/10 text-xs text-warning">
					<AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
					<span>{dep}</span>
				</div>
			)}
		</div>
	);
}

function deprecationNote(m: Model): string | null {
	const d = m.spec.deprecation;
	const date = m.spec.deprecationDate;
	if (!d && !date) return null;
	const parts: string[] = [];
	if (d?.status) parts.push(d.status);
	if (d?.sunsetDate) parts.push(`sunsets ${d.sunsetDate}`);
	else if (date) parts.push(`deprecated ${date}`);
	if (d?.replacement) parts.push(`successor → ${d.replacement}`);
	return parts.join(" · ") || null;
}

/* ---------------- Overview ---------------- */

function OverviewTab({
	model,
	hostRows,
	policyRows,
}: {
	model: Model;
	hostRows: ModelHostView[];
	policyRows: ModelPolicyView[];
}) {
	const caps = activeCapabilities(model.spec.capabilities);
	const tags = model.spec.tags ?? [];
	const enabledHosts = hostRows.filter((h) => h.binding.enabled).length;
	const throttled = policyRows.filter(
		(p) => (p.limits?.length ?? 0) > 0,
	).length;

	return (
		<div className="flex flex-col gap-6 pt-2">
			<IssuesPanel modelId={model.metadata.id} />

			<section>
				<SectionTitle>Overview</SectionTitle>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<StatCard
						label="Hosts"
						value={hostRows.length}
						sub={
							hostRows.length === 0 ? "not deployed" : `${enabledHosts} enabled`
						}
					/>
					<StatCard
						label="Policies"
						value={policyRows.length}
						sub={policyRows.length === 0 ? "unused" : `${throttled} throttled`}
					/>
					<StatCard
						label="Capabilities"
						value={caps.length}
						sub={caps.length === 0 ? "none declared" : "active"}
					/>
					<StatCard
						label="Snapshots"
						value={(model.spec.snapshots ?? []).length}
						sub={
							(model.spec.snapshots ?? []).length === 0
								? "none"
								: `pointer → ${model.spec.pointer || "—"}`
						}
					/>
					{model.metadata.id && (
						<>
							<Suspense fallback={<UsageCardsSkeleton />}>
								<ModelUsageCards modelId={model.metadata.id} />
							</Suspense>
							<Suspense fallback={<ResourceSpendCardSkeleton />}>
								<ResourceSpendCard
									dimension="model_id"
									id={model.metadata.id}
								/>
							</Suspense>
						</>
					)}
				</div>
			</section>

			<Card title="Identity" icon={LayoutGrid}>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					<IdentityTile
						icon={Layers}
						label="Family"
						value={
							model.spec.family
								? `${model.spec.family}${model.spec.version ? ` ${model.spec.version}` : ""}`
								: undefined
						}
					/>
					<IdentityTile
						icon={CalendarDays}
						label="Released"
						value={model.spec.releaseDate}
					/>
					<IdentityTile
						icon={BookOpen}
						label="Knowledge cutoff"
						value={model.spec.knowledgeCutoff}
					/>
					<IdentityTile
						icon={Scale}
						label="License"
						value={model.spec.license}
					/>
					{model.spec.pointer && (
						<IdentityTile
							icon={GitBranch}
							label="Points to"
							value={model.spec.pointer}
						/>
					)}
				</div>
				{tags.length > 0 && (
					<div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-1.5">
						<span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
							Tags
						</span>
						{tags.map((t) => (
							<span
								key={t}
								className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium bg-muted text-foreground border border-border"
							>
								#{t}
							</span>
						))}
					</div>
				)}
			</Card>

			{caps.length > 0 && (
				<Card title="Capabilities" icon={Brain}>
					<CapabilityChips caps={caps} />
				</Card>
			)}

			{(model.spec.snapshots?.length ?? 0) > 0 && (
				<Card title="Snapshots" icon={History}>
					<SnapshotsList snapshots={model.spec.snapshots ?? []} />
				</Card>
			)}
		</div>
	);
}

function SnapshotsList({
	snapshots,
}: {
	snapshots: { name: string; originalName?: string; releasedAt?: string }[];
}) {
	const sorted = [...snapshots].sort((a, b) => {
		const ad = a.releasedAt ?? "";
		const bd = b.releasedAt ?? "";
		if (ad && bd) return bd.localeCompare(ad);
		if (ad) return -1;
		if (bd) return 1;
		return a.name.localeCompare(b.name);
	});
	return (
		<ul className="divide-y divide-border">
			{sorted.map((s) => (
				<li
					key={s.name}
					className="py-2 first:pt-0 last:pb-0 flex items-baseline justify-between gap-3"
				>
					<div className="min-w-0">
						<div className="font-mono text-xs text-foreground truncate">
							{s.name}
						</div>
						{s.originalName && s.originalName !== s.name && (
							<div className="font-mono text-[10px] text-muted-foreground truncate">
								upstream {s.originalName}
							</div>
						)}
					</div>
					<div className="text-[11px] text-muted-foreground tabular-nums shrink-0">
						{s.releasedAt || "—"}
					</div>
				</li>
			))}
		</ul>
	);
}

function ModelUsageCards({ modelId }: { modelId: string }) {
	const usage = useModelUsage(modelId);
	return <ResourceUsageCards usage={usage} />;
}

/* ---------------- Hosts ---------------- */

function HostsTab({
	rows,
	hostById,
}: {
	rows: ModelHostView[];
	hostById: Map<string, Host>;
}) {
	if (rows.length === 0) {
		return (
			<EmptyState
				icon={Server}
				title="Not deployed on any host"
				body="Add this model to a host's catalog (or wait for sync) to make it callable."
			/>
		);
	}
	return (
		<div className="mt-2 rounded-md border border-border bg-card overflow-hidden">
			<table className="w-full text-sm">
				<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
					<tr>
						<Th>Host</Th>
						<Th>Upstream</Th>
						<Th>Snapshots</Th>
						<Th>Adapter</Th>
						<Th className="text-right">Status</Th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{rows.map((row) => {
						const host = hostById.get(row.host.id);
						const snapshots = row.binding.snapshots ?? [];
						return (
							<tr
								key={row.binding.id}
								className="hover:bg-muted/30 transition-colors"
							>
								<Td>
									<Link
										to="/hosts/$name"
										params={{ name: row.host.name }}
										className="block"
									>
										<HostCell
											host={host}
											size="sm"
											fallbackLabel={displayLabel(row.host)}
										/>
									</Link>
								</Td>
								<Td>
									{row.binding.upstreamName ? (
										<code className="font-mono text-[11px] text-foreground">
											{row.binding.upstreamName}
										</code>
									) : (
										<span className="text-[11px] text-muted-foreground">—</span>
									)}
								</Td>
								<Td>
									{snapshots.length > 0 ? (
										<ul className="flex flex-wrap gap-1">
											{snapshots.map((s) => (
												<li
													key={s}
													className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground"
												>
													{s}
												</li>
											))}
										</ul>
									) : (
										<span className="text-[11px] text-muted-foreground">
											All snapshots
										</span>
									)}
								</Td>
								<Td>
									<span className="text-xs text-foreground">
										{row.binding.adapter}
									</span>
								</Td>
								<Td className="text-right">
									<StatusInline enabled={row.binding.enabled} />
								</Td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

/* ---------------- Policies ---------------- */

function PoliciesTab({ rows }: { rows: ModelPolicyView[] }) {
	if (rows.length === 0) {
		return (
			<EmptyState
				icon={ShieldCheck}
				title="Not granted by any policy"
				body="No user policy's catalog covers this model. Add a matching ref to a policy's grants to expose it."
			/>
		);
	}
	return (
		<div className="mt-2 rounded-md border border-border bg-card overflow-hidden">
			<table className="w-full text-sm">
				<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
					<tr>
						<Th>Policy</Th>
						<Th>Owner</Th>
						<Th>Limits applied</Th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{rows.map((row) => {
						const limits = row.limits ?? [];
						return (
							<tr key={row.id} className="hover:bg-muted/30 transition-colors">
								<Td>
									<Link
										to="/policies/$name"
										params={{ name: row.name }}
										className="font-mono text-[12px] text-foreground hover:underline"
									>
										{row.name}
									</Link>
								</Td>
								<Td>
									<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
										<span className="rounded bg-muted px-1.5 py-0.5 font-medium uppercase tracking-wide text-[9px] text-muted-foreground border border-border">
											{row.owner.kind}
										</span>
										{row.owner.name && (
											<span className="text-foreground">{row.owner.name}</span>
										)}
									</span>
								</Td>
								<Td>
									{limits.length === 0 ? (
										<span className="text-[11px] text-muted-foreground">
											no limit
										</span>
									) : (
										<ul className="flex flex-wrap gap-1">
											{limits.map((l) => (
												<li
													key={`${l.meter}-${l.window}-${l.amount}`}
													className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground"
													title={l.strategy}
												>
													{l.amount.toLocaleString()} {l.meter} / {l.window}
												</li>
											))}
										</ul>
									)}
								</Td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

/* ---------------- Limits ---------------- */

function LimitsTab({ model }: { model: Model }) {
	return (
		<div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
			<Card title="Context window" icon={Settings2}>
				<dl className="divide-y divide-border">
					<Row label="Total">
						<TokenValue n={model.spec.contextWindowTotal} />
					</Row>
					<Row label="Input">
						<TokenValue n={model.spec.contextWindowInput} />
					</Row>
					<Row label="Output">
						<TokenValue n={model.spec.contextWindowOutput} />
					</Row>
					<Row label="Max output">
						<TokenValue n={model.spec.maxOutputTokens} />
					</Row>
				</dl>
			</Card>
			<Card title="Modalities" icon={Layers}>
				<dl className="divide-y divide-border">
					<Row label="Input">
						<ModalityList items={model.spec.modalities?.input} />
					</Row>
					<Row label="Output">
						<ModalityList items={model.spec.modalities?.output} />
					</Row>
				</dl>
			</Card>
		</div>
	);
}

function TokenValue({ n }: { n: number | undefined }) {
	if (!n) return <Dash />;
	return (
		<span className="font-mono tabular-nums text-foreground">
			{fmtTokens(n)}
		</span>
	);
}

function ModalityList({
	items,
}: {
	items: readonly string[] | null | undefined;
}) {
	if (!items || items.length === 0) return <Dash />;
	return (
		<ul className="flex flex-wrap gap-1.5">
			{items.map((m) => (
				<li
					key={m}
					className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium bg-muted text-foreground border border-border capitalize"
				>
					{m}
				</li>
			))}
		</ul>
	);
}

function fmtTokens(n: number): string {
	if (n >= 1_000_000)
		return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
	if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
	return String(n);
}

/* ---------------- Pricing (per host binding) ---------------- */

function PricingTab({
	model,
	hostRows,
	hostById,
}: {
	model: Model;
	hostRows: ModelHostView[];
	hostById: Map<string, Host>;
}) {
	if (!model.metadata.id) {
		return (
			<ComingSoon
				icon={DollarSign}
				title="Pricing"
				body="Save this model to attach and view its pricing."
			/>
		);
	}
	return (
		<Suspense fallback={<PricingSkeleton />}>
			<ModelPricing
				modelId={model.metadata.id}
				hostRows={hostRows}
				hostById={hostById}
			/>
		</Suspense>
	);
}

/**
 * Pricing grouped under each host — the model_hosts view returns the binding +
 * its attached pricing together, so each card is one host with its rates plus
 * billing context and (when traffic exists) estimated spend over the window.
 */
function ModelPricing({
	modelId,
	hostRows,
	hostById,
}: {
	modelId: string;
	hostRows: ModelHostView[];
	hostById: Map<string, Host>;
}) {
	const spend = useModelHostSpend(modelId);

	// Cheapest host by example-request cost — only meaningful with ≥2 priced hosts.
	const costByHost = new Map<string, number>();
	for (const row of hostRows) {
		const c = blendedRequestCost(bindingPricing(row)?.rates ?? []);
		if (c != null && c > 0) costByHost.set(row.host.id, c);
	}
	const cheapest =
		costByHost.size >= 2 ? Math.min(...costByHost.values()) : null;
	const windowText = windowLabel(spend.from, spend.to);

	if (hostRows.length === 0) {
		return (
			<div className="mt-4 rounded-md border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
				<DollarSign
					className="mx-auto w-6 h-6 text-muted-foreground/60 mb-2"
					aria-hidden
				/>
				<div className="text-sm font-medium text-foreground">
					No pricing configured
				</div>
				<div className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
					This model isn't bound to a host yet. Pricing appears per host once a
					binding is in place.
				</div>
			</div>
		);
	}

	return (
		<div className="mt-2 flex flex-col gap-4">
			{hostRows.map((row) => (
				<HostPricingCard
					key={row.binding.id}
					row={row}
					host={hostById.get(row.host.id)}
					usage={spend.byHost.get(row.host.id)}
					windowText={windowText}
					isCheapest={
						cheapest != null && costByHost.get(row.host.id) === cheapest
					}
				/>
			))}
		</div>
	);
}

/** One host's pricing card: rates, billing context, and cost figures. */
function HostPricingCard({
	row,
	host,
	usage,
	windowText,
	isCheapest,
}: {
	row: ModelHostView;
	host: Host | undefined;
	usage: BindingUsage | undefined;
	windowText: string;
	isCheapest?: boolean;
}) {
	const pricing = bindingPricing(row);
	const rates = pricing?.rates ?? [];
	const hasPricing = rates.length > 0;
	const currency = pricing?.currency || "USD";
	const example = hasPricing ? blendedRequestCost(rates) : null;
	// Server-stamped over the window; null when none of the pair's events
	// were priced (must show as absent, never $0).
	const estSpend = usage?.cost.usd ?? null;
	const snapshots = row.binding.snapshots ?? [];
	const hasBillingContext = !!row.binding.upstreamName || snapshots.length > 0;

	return (
		<section className="rounded-md border border-border bg-card">
			<header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
				<div className="flex min-w-0 items-center gap-2">
					<Link to="/hosts/$name" params={{ name: row.host.name }}>
						<HostCell
							host={host}
							size="sm"
							fallbackLabel={displayLabel(row.host)}
						/>
					</Link>
					<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
						{row.binding.adapter}
					</span>
					{!row.binding.enabled && (
						<span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
							disabled
						</span>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{isCheapest && (
						<span className="inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
							<TrendingDown className="size-3" aria-hidden />
							Cheapest
						</span>
					)}
					{hasPricing &&
						(pricing?.name ? (
							<Link
								to="/pricing/$name"
								params={{ name: pricing.name }}
								title={`View pricing "${pricing.name}"`}
								className="font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground hover:underline"
							>
								{currency}
							</Link>
						) : (
							<span className="font-mono text-[11px] uppercase text-muted-foreground">
								{currency}
							</span>
						))}
				</div>
			</header>
			<div className="flex flex-col gap-3 px-4 py-3">
				{hasPricing ? (
					<MeterGrid rates={rates} currency={currency} />
				) : (
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<DollarSign
							className="size-3.5 text-muted-foreground/60"
							aria-hidden
						/>
						No pricing attached to this host binding.
					</div>
				)}

				{(hasBillingContext || example != null || estSpend != null) && (
					<dl className="flex flex-col gap-1.5 border-t border-border/60 pt-2.5 text-[11px]">
						{row.binding.upstreamName && (
							<div className="flex items-center justify-between gap-3">
								<dt className="text-muted-foreground">Billed as</dt>
								<dd className="truncate font-mono text-foreground">
									{row.binding.upstreamName}
								</dd>
							</div>
						)}
						{snapshots.length > 0 && (
							<div className="flex items-center justify-between gap-3">
								<dt className="text-muted-foreground">Snapshots</dt>
								<dd className="flex flex-wrap justify-end gap-1">
									{snapshots.map((s) => (
										<span
											key={s}
											className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
										>
											{s}
										</span>
									))}
								</dd>
							</div>
						)}
						{example != null && (
							<div className="flex items-center justify-between gap-3">
								<dt className="text-muted-foreground">
									Example request{" "}
									<span className="text-muted-foreground/60">
										(800 in / 200 out)
									</span>
								</dt>
								<dd className="font-mono tabular-nums text-foreground">
									≈ {fmtCost(example, currency)}{" "}
									<span className="text-muted-foreground">/ 1K</span>
								</dd>
							</div>
						)}
						{estSpend != null && usage && (
							<div className="flex items-center justify-between gap-3">
								<dt className="text-muted-foreground">
									Est. spend · last {windowText}{" "}
									<span className="text-muted-foreground/60">
										({usage.requests.toLocaleString()} req)
									</span>
								</dt>
								<dd className="font-mono tabular-nums text-foreground">
									≈ {fmtCost(estSpend, "USD")}
								</dd>
							</div>
						)}
					</dl>
				)}
			</div>
		</section>
	);
}

/**
 * The schema marks ModelHostRow.pricing as required, but the relay serializes
 * null for bindings without a pricing record — re-type it nullable here so
 * every read is guarded. Drop once the BE marks the field optional.
 */
function bindingPricing(row: ModelHostView): ModelHostView["pricing"] | null {
	return row.pricing;
}

/** Round a [from,to] window to a friendly "30d" / "12h" label. */
function windowLabel(from: string, to: string): string {
	const ms = Date.parse(to) - Date.parse(from);
	if (!Number.isFinite(ms) || ms <= 0) return "window";
	const days = Math.round(ms / 86_400_000);
	if (days >= 1) return `${days}d`;
	return `${Math.max(1, Math.round(ms / 3_600_000))}h`;
}

function PricingSkeleton() {
	return (
		<div className="mt-4 rounded-md border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
			Loading pricing…
		</div>
	);
}

/* ---------------- Shared ---------------- */

function IssuesPanel({ modelId }: { modelId: string | undefined }) {
	const diagnostics = useModelDiagnostics(modelId);
	if (diagnostics.length === 0) return null;
	const counts = {
		error: diagnostics.filter((d) => d.severity === "error").length,
		warn: diagnostics.filter((d) => d.severity === "warn").length,
		info: diagnostics.filter((d) => d.severity === "info").length,
	};
	const summary = [
		counts.error && `${counts.error} error${counts.error === 1 ? "" : "s"}`,
		counts.warn && `${counts.warn} warning${counts.warn === 1 ? "" : "s"}`,
		counts.info && `${counts.info} info`,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<section>
			<div className="mb-2 flex items-baseline justify-between gap-2">
				<SectionTitle>Issues</SectionTitle>
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{summary}
				</span>
			</div>
			<DiagnosticList diagnostics={diagnostics} />
		</section>
	);
}

interface CapMeta {
	icon: LucideIcon;
	label: string;
}

const CAPABILITY_META: Record<string, CapMeta> = {
	chat: { icon: MessageSquare, label: "Chat" },
	vision: { icon: Eye, label: "Vision" },
	tools: { icon: Wrench, label: "Tool use" },
	parallelTools: { icon: ListOrdered, label: "Parallel tool calls" },
	jsonMode: { icon: Braces, label: "JSON mode" },
	structuredOutput: { icon: ListTree, label: "Structured output" },
	structuredOutputs: { icon: ListTree, label: "Structured outputs" },
	streaming: { icon: Radio, label: "Streaming" },
	reasoning: { icon: Brain, label: "Reasoning" },
	systemMessages: { icon: FileText, label: "System messages" },
	assistantPrefill: { icon: KeyRound, label: "Assistant prefill" },
	fileInput: { icon: Paperclip, label: "File input" },
	embeddings: { icon: Zap, label: "Embeddings" },
	webSearch: { icon: Globe, label: "Web search" },
	computerUse: { icon: Monitor, label: "Computer use" },
	batch: { icon: Layers, label: "Batch" },
	promptCache: { icon: Settings2, label: "Prompt caching" },
	audio: { icon: Volume2, label: "Audio" },
	audioInput: { icon: Mic, label: "Audio input" },
	audioOutput: { icon: Volume2, label: "Audio output" },
};

function CapabilityChips({ caps }: { caps: string[] }) {
	return (
		<ul className="flex flex-wrap gap-1.5">
			{caps.map((c) => {
				const meta = CAPABILITY_META[c] ?? { icon: ImageIcon, label: c };
				const Icon = meta.icon;
				return (
					<li
						key={c}
						className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium bg-muted text-foreground border border-border"
					>
						<Icon className="w-3 h-3" aria-hidden />
						{meta.label}
					</li>
				);
			})}
		</ul>
	);
}

function activeCapabilities(cap: ModelCapabilities | undefined): string[] {
	if (!cap) return [];
	return Object.entries(cap)
		.filter(([, v]) => v === true)
		.map(([k]) => k);
}

function Card({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon: typeof LayoutGrid;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-md border border-border bg-card">
			<header className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
				<Icon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
				<h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
					{title}
				</h2>
			</header>
			<div className="px-4 py-3">{children}</div>
		</section>
	);
}

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="py-3 first:pt-0 last:pb-0 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-4">
			<dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
			<dd className="text-xs text-foreground min-w-0">{children}</dd>
		</div>
	);
}

function Th({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<th
			scope="col"
			className={`px-3 py-1.5 text-left font-medium ${className}`}
		>
			{children}
		</th>
	);
}

function Td({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}

function StatusInline({ enabled }: { enabled: boolean }) {
	return enabled ? (
		<span className="text-[11px] text-success">
			Enabled
		</span>
	) : (
		<span className="text-[11px] text-muted-foreground">Disabled</span>
	);
}

function StatusBadge({ enabled }: { enabled: boolean }) {
	return enabled ? (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-success-soft text-success border border-success/30">
			Enabled
		</span>
	) : (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
			Disabled
		</span>
	);
}

function OwnerBadge({ label }: { label: string }) {
	return (
		<span
			className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border"
			title={`${label}-owned.`}
		>
			{label}-owned
		</span>
	);
}

function IdentityTile({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof LayoutGrid;
	label: string;
	value: string | null | undefined;
}) {
	return (
		<div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 flex items-start gap-2.5">
			<Icon
				className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0"
				aria-hidden
			/>
			<div className="min-w-0">
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
					{label}
				</div>
				<div className="text-sm text-foreground truncate">
					{value || <span className="text-muted-foreground/70">—</span>}
				</div>
			</div>
		</div>
	);
}

function StatCard({
	label,
	value,
	sub,
	mono,
}: {
	label: string;
	value: string | number;
	sub?: string;
	mono?: boolean;
}) {
	return (
		<div className="rounded-md border border-border bg-card px-3 py-2">
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</div>
			<div
				className={`mt-0.5 text-lg font-semibold text-foreground tabular-nums ${mono ? "font-mono text-base" : ""}`}
			>
				{value}
			</div>
			{sub && (
				<div className="text-[11px] text-muted-foreground mt-0.5 truncate">
					{sub}
				</div>
			)}
		</div>
	);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
			{children}
		</h2>
	);
}

function Dash() {
	return <span className="text-muted-foreground/70">—</span>;
}

function EmptyState({
	icon: Icon,
	title,
	body,
}: {
	icon: typeof LayoutGrid;
	title: string;
	body: string;
}) {
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
		</div>
	);
}

function ComingSoon({
	icon: Icon,
	title,
	body,
}: {
	icon: typeof LayoutGrid;
	title: string;
	body: string;
}) {
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
