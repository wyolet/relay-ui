import { Link } from "@tanstack/react-router";
import {
	Boxes,
	ExternalLink,
	LayoutGrid,
	Power,
	Server,
	Trash2,
} from "lucide-react";
import { useGovernance } from "@/api/hooks/governance";
import type { Model } from "@/api/types/model";
import type { Provider } from "@/api/types/provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HostCell } from "@/hosts/HostCell";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { resolveMutability } from "@/lib/ownership";
import { ProviderLogo } from "@/providers/ProviderLogo";
import {
	type ProviderReferences,
	useProviderReferences,
} from "@/providers/useProviderReferences";
import { OwnerBadge, StatusBadge } from "@/shared/StatusBadge";
import { Th } from "@/shared/Th";

export type ProviderDetailTab = "overview" | "models" | "hosts";

interface Props {
	provider: Provider;
	tab: ProviderDetailTab;
	onTabChange: (next: ProviderDetailTab) => void;
	onToggleEnabled: () => void;
	toggling?: boolean;
	onDelete: () => void;
	deleting?: boolean;
}

const TABS: {
	value: ProviderDetailTab;
	label: string;
	icon: typeof LayoutGrid;
}[] = [
	{ value: "overview", label: "Overview", icon: LayoutGrid },
	{ value: "models", label: "Models", icon: Boxes },
	{ value: "hosts", label: "Hosts", icon: Server },
];

export function ProviderDetailView({
	provider,
	tab,
	onTabChange,
	onToggleEnabled,
	toggling,
	onDelete,
	deleting,
}: Props) {
	const refs = useProviderReferences(provider);

	return (
		<div className="flex flex-col gap-5">
			<Header
				provider={provider}
				refs={refs}
				onToggleEnabled={onToggleEnabled}
				toggling={toggling}
				onDelete={onDelete}
				deleting={deleting}
			/>

			<Tabs
				value={tab}
				onValueChange={(v) =>
					onTabChange((v ?? "overview") as ProviderDetailTab)
				}
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
					<OverviewTab refs={refs} />
				</TabsContent>
				<TabsContent value="models">
					<ModelsTable models={refs.models} />
				</TabsContent>
				<TabsContent value="hosts">
					<HostsTab refs={refs} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

/* ---------------- Header ---------------- */

function Header({
	provider,
	refs,
	onToggleEnabled,
	toggling,
	onDelete,
	deleting,
}: {
	provider: Provider;
	refs: ProviderReferences;
	onToggleEnabled: () => void;
	toggling?: boolean;
	onDelete: () => void;
	deleting?: boolean;
}) {
	const enabled = provider.spec.enabled !== false;
	const system = provider.metadata.owner?.kind === "system";
	const gov = useGovernance("provider");
	const { canEdit, canDelete } = resolveMutability(
		provider.metadata.owner?.kind,
		gov,
	);

	const links: { href: string | undefined; label: string }[] = [
		{ href: provider.spec.docsURL, label: "Docs" },
		{ href: provider.spec.homepageURL, label: "Homepage" },
		{ href: provider.spec.statusPageURL, label: "Status" },
	];
	const activeLinks = links.filter((l) => l.href);

	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0 flex items-start gap-3">
				<ProviderLogo
					provider={provider}
					size={44}
					className="mt-0.5 shrink-0"
				/>
				<div className="min-w-0">
					<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2 flex-wrap">
						{displayLabel(provider.metadata)}
						{!hasDisplayName(provider.metadata) && (
							<span className="text-[11px] text-muted-foreground font-normal">
								(no display name)
							</span>
						)}
						<StatusBadge enabled={enabled} />
						{system && <OwnerBadge label="System" title="System-managed." />}
					</h1>
					<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
						{provider.metadata.name}
					</p>
					<p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
						<span className="text-foreground">{refs.models.length}</span> model
						{refs.models.length === 1 ? "" : "s"}
						<span className="text-muted-foreground/50"> · </span>
						<span className="text-foreground">{refs.hosts.length}</span> host
						{refs.hosts.length === 1 ? "" : "s"}
					</p>
					{provider.metadata.description && (
						<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
							{provider.metadata.description}
						</p>
					)}
					{activeLinks.length > 0 && (
						<ul className="mt-2 flex flex-wrap gap-1.5">
							{activeLinks.map((l) => (
								<li key={l.label}>
									<a
										href={l.href}
										target="_blank"
										rel="noreferrer noopener"
										className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-border bg-card text-[11px] text-foreground hover:bg-muted transition-colors"
									>
										{l.label}
										<ExternalLink className="w-2.5 h-2.5 opacity-60" />
									</a>
								</li>
							))}
						</ul>
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
				{canDelete && (
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
	);
}

/* ---------------- Overview ---------------- */

function OverviewTab({ refs }: { refs: ProviderReferences }) {
	const enabledModels = refs.models.filter(
		(m) => m.spec.enabled !== false,
	).length;
	const families = new Set(
		refs.models.map((m) => m.spec.family?.trim() || "Other"),
	);

	return (
		<div className="flex flex-col gap-6 pt-2">
			<section>
				<SectionTitle>Overview</SectionTitle>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
					<StatCard
						label="Models"
						value={refs.models.length}
						sub={
							refs.models.length === 0
								? "none registered"
								: `${enabledModels} enabled`
						}
					/>
					<StatCard
						label="Families"
						value={families.size}
						sub={families.size === 0 ? "—" : "distinct"}
					/>
					<StatCard
						label="Hosts"
						value={refs.hosts.length}
						sub={refs.hosts.length === 0 ? "no host serves" : "serving"}
					/>
				</div>
			</section>
		</div>
	);
}

/* ---------------- Models ---------------- */

function ModelsTable({ models }: { models: Model[] }) {
	if (models.length === 0) {
		return (
			<EmptyState
				icon={Boxes}
				title="No models from this provider"
				body="Once the provider's catalog syncs, models will appear here."
			/>
		);
	}
	const grouped = groupByFamily(models);
	return (
		<div className="mt-2 flex flex-col gap-3">
			<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
				{models.length} model{models.length === 1 ? "" : "s"} · {grouped.length}{" "}
				famil{grouped.length === 1 ? "y" : "ies"}
			</div>
			<div className="rounded-md border border-border bg-card overflow-hidden">
				<ul className="divide-y divide-border">
					{grouped.map((g) => (
						<li key={g.family}>
							<div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/20 border-b border-border">
								<span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
									{g.family}
								</span>
								<span className="text-[10px] text-muted-foreground tabular-nums">
									{g.models.length}
								</span>
							</div>
							<ul className="divide-y divide-border">
								{g.models.map((m) => {
									const enabled = m.spec.enabled !== false;
									return (
										<li
											key={m.metadata.name}
											className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-muted/30"
										>
											<div className="min-w-0 flex items-center gap-2">
												<Link
													to="/models/$name"
													params={{ name: m.metadata.name }}
													className="text-sm text-foreground hover:underline truncate"
												>
													{displayLabel(m.metadata)}
												</Link>
												<code className="font-mono text-[10px] text-muted-foreground truncate">
													{m.metadata.name}
												</code>
											</div>
											<StatusInline enabled={enabled} />
										</li>
									);
								})}
							</ul>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

interface FamilyGroup {
	family: string;
	models: Model[];
}

function groupByFamily(models: readonly Model[]): FamilyGroup[] {
	const map = new Map<string, Model[]>();
	for (const m of models) {
		const family = m.spec.family?.trim() || "Other";
		const arr = map.get(family) ?? [];
		arr.push(m);
		map.set(family, arr);
	}
	const out: FamilyGroup[] = [];
	for (const [family, ms] of map.entries()) {
		ms.sort((a, b) =>
			displayLabel(a.metadata).localeCompare(displayLabel(b.metadata)),
		);
		out.push({ family, models: ms });
	}
	out.sort((a, b) => b.models.length - a.models.length);
	return out;
}

/* ---------------- Hosts ---------------- */

function HostsTab({ refs }: { refs: ProviderReferences }) {
	if (refs.hosts.length === 0) {
		return (
			<EmptyState
				icon={Server}
				title="No host serves this provider's models"
				body="Add this provider's models to a host's catalog to start routing."
			/>
		);
	}
	return (
		<div className="mt-2 rounded-md border border-border bg-card overflow-hidden">
			<table className="w-full text-sm">
				<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
					<tr>
						<Th>Host</Th>
						<Th className="text-right">Models served</Th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{refs.hosts.map((h) => {
						const count = refs.modelCountByHost.get(h.metadata.id ?? "") ?? 0;
						return (
							<tr
								key={h.metadata.name}
								className="hover:bg-muted/30 transition-colors"
							>
								<Td>
									<Link
										to="/hosts/$name"
										params={{ name: h.metadata.name }}
										className="block"
									>
										<HostCell host={h} size="sm" />
									</Link>
								</Td>
								<Td className="text-right tabular-nums">
									<span className="text-foreground">{count}</span>
								</Td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

/* ---------------- Shared ---------------- */

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
		<span className="text-[11px] text-success">Enabled</span>
	) : (
		<span className="text-[11px] text-muted-foreground">Disabled</span>
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
