import { Link } from "@tanstack/react-router";
import {
	AudioLines,
	Brain,
	ChevronDown,
	ChevronRight,
	Eye,
	type LucideIcon,
	Network,
	Wrench,
} from "lucide-react";
import { useState } from "react";
import type { Policy } from "@/api/types/policy";
import { HostLogo, hostRefLogo } from "@/hosts/HostLogo";
import {
	type PolicyModelView,
	usePolicyExcludedModels,
	usePolicyModels,
} from "@/policies/usePolicyModels";
import { OptionRow } from "@/shared/OptionRow";

interface Props {
	policy: Policy;
}

/**
 * Models this policy grants, resolved server-side via
 * `GET /policies/{ref}/models`. Each row is a concrete (provider, model, host)
 * binding the policy grants — capabilities, context window, deprecation, and
 * the matching grant ref all arrive pre-joined, so we only group by host here.
 */
export function PolicyModelsTab({ policy }: Props) {
	const rows = usePolicyModels(policy.metadata.name);
	const grants = policy.spec.models ?? [];

	if (grants.length === 0) {
		return (
			<EmptyState
				title="No catalog refs"
				message="This policy currently grants nothing. Add catalog refs in the edit form."
			/>
		);
	}

	if (rows.length === 0) {
		return (
			<div className="flex flex-col gap-3">
				<EmptyState
					title="No reachable models"
					message="The catalog refs on this policy don't match any model currently in the catalog. They may match models added later, or you may need to revisit them."
				/>
				<ExcludedModelsPanel policyName={policy.metadata.name} />
			</div>
		);
	}

	const byHost = new Map<string, PolicyModelView[]>();
	for (const row of rows) {
		const list = byHost.get(row.host.id) ?? [];
		list.push(row);
		byHost.set(row.host.id, list);
	}
	for (const list of byHost.values()) {
		list.sort(
			(a, b) =>
				a.provider.name.localeCompare(b.provider.name) ||
				a.model.name.localeCompare(b.model.name),
		);
	}

	const hostIds = [...byHost.keys()].sort((a, b) =>
		hostLabel(byHost.get(a)?.[0]).localeCompare(hostLabel(byHost.get(b)?.[0])),
	);
	const distinctModels = new Set(
		rows.map((r) => `${r.provider.name}/${r.model.name}`),
	);

	return (
		<div className="flex flex-col gap-4 pt-2">
			<div className="text-[11px] text-muted-foreground">
				Grouped by host. {grants.length} catalog grant
				{grants.length === 1 ? "" : "s"} reach{" "}
				<span className="text-foreground tabular-nums">
					{distinctModels.size}
				</span>{" "}
				model{distinctModels.size === 1 ? "" : "s"} across{" "}
				<span className="text-foreground tabular-nums">{hostIds.length}</span>{" "}
				host{hostIds.length === 1 ? "" : "s"}.
			</div>

			{hostIds.map((hostId) => {
				const list = byHost.get(hostId) ?? [];
				return <HostGroup key={hostId} rows={list} />;
			})}

			<ExcludedModelsPanel policyName={policy.metadata.name} />
		</div>
	);
}

/**
 * Lazily reveals the models this policy does NOT grant, with the reason, via
 * `GET /policies/{ref}/models?debug=true`. Useful when the catalog looks
 * emptier than expected — distinguishes a data/seed gap from a UI bug.
 */
function ExcludedModelsPanel({ policyName }: { policyName: string }) {
	const [open, setOpen] = useState(false);
	const { excluded, isLoading } = usePolicyExcludedModels(policyName, open);

	return (
		<div className="mt-1">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
			>
				{open ? (
					<ChevronDown className="w-3 h-3" />
				) : (
					<ChevronRight className="w-3 h-3" />
				)}
				Why are some models missing?
			</button>

			{open && (
				<div className="mt-2 rounded-md border border-border bg-card overflow-hidden">
					{isLoading ? (
						<div className="px-3 py-3 text-[11px] text-muted-foreground">
							Loading…
						</div>
					) : excluded.length === 0 ? (
						<div className="px-3 py-3 text-[11px] text-muted-foreground">
							Nothing excluded — every model in the catalog is granted by this
							policy.
						</div>
					) : (
						<ul className="divide-y divide-border">
							{excluded.map((x) => (
								<li
									key={x.model.id}
									className="flex items-baseline gap-3 px-3 py-1.5 text-sm"
								>
									<div className="flex items-baseline gap-2 min-w-0 flex-1 flex-wrap">
										{x.model.displayName?.trim() && (
											<span className="text-foreground text-[13px] truncate">
												{x.model.displayName.trim()}
											</span>
										)}
										<code className="font-mono text-foreground text-[11px] truncate">
											{x.model.name}
										</code>
									</div>
									<span className="text-[11px] text-muted-foreground text-right">
										{x.reason}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}

const COLLAPSE_THRESHOLD = 6;

function HostGroup({ rows }: { rows: PolicyModelView[] }) {
	const host = rows[0]?.host;
	const [expanded, setExpanded] = useState(false);
	const showToggle = rows.length > COLLAPSE_THRESHOLD;
	const visible = expanded ? rows : rows.slice(0, COLLAPSE_THRESHOLD);
	const hiddenCount = rows.length - visible.length;

	return (
		<section className="rounded-md border border-border bg-card overflow-hidden">
			<header className="flex items-center gap-3 px-3 py-2 border-b border-border bg-muted/30">
				{host ? (
					<HostLogo host={hostRefLogo(host)} size={20} />
				) : (
					<div className="w-5 h-5 rounded bg-muted" aria-hidden />
				)}
				<div className="min-w-0 flex-1">
					<div className="text-sm font-medium text-foreground truncate">
						{hostLabel(rows[0])}
					</div>
					<div className="text-[11px] text-muted-foreground truncate font-mono">
						{host?.name}
					</div>
				</div>
				{host && host.enabled === false && (
					<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
						Host off
					</span>
				)}
				<span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
					{rows.length} model{rows.length === 1 ? "" : "s"}
				</span>
			</header>

			<ul className="divide-y divide-border">
				{visible.map((row) => (
					<ModelRow key={`${row.provider.name}/${row.model.name}`} row={row} />
				))}
			</ul>

			{showToggle && (
				<OptionRow
					onClick={() => setExpanded((v) => !v)}
					className="justify-center gap-1 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
				>
					{expanded ? (
						<>
							<ChevronDown className="w-3 h-3" /> Show fewer
						</>
					) : (
						<>
							<ChevronRight className="w-3 h-3" />
							Show all models ({hiddenCount} more)
						</>
					)}
				</OptionRow>
			)}
		</section>
	);
}

function ModelRow({ row }: { row: PolicyModelView }) {
	const { model, matchedBy } = row;
	const displayName = model.displayName?.trim();
	const ctx = pickContextWindow(model);
	const deprecation = model.deprecation?.status;
	const refs = matchedBy ?? [];
	return (
		<li className="flex items-center gap-3 px-3 py-1.5 text-sm hover:bg-muted/40">
			<div className="flex items-baseline gap-2 min-w-0 flex-1 flex-wrap">
				{displayName && (
					<span className="text-foreground text-[13px] truncate">
						{displayName}
					</span>
				)}
				<Link
					to="/models/$name"
					params={{ name: model.name }}
					className="font-mono text-foreground text-[11px] hover:underline truncate"
				>
					{model.name}
				</Link>
				{deprecation && <DeprecationBadge status={deprecation} />}
				{refs.length > 0 && (
					<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
						<span>via</span>
						{refs.map((ref) => (
							<code
								key={ref}
								className="font-mono px-1 py-px rounded bg-muted text-foreground/80"
							>
								{ref}
							</code>
						))}
					</span>
				)}
			</div>
			<CapabilityIcons caps={model.capabilities} />
			{ctx && (
				<span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap min-w-[3.5rem] text-right">
					{ctx} ctx
				</span>
			)}
		</li>
	);
}

const CAPS: { key: string; Icon: LucideIcon; label: string }[] = [
	{ key: "vision", Icon: Eye, label: "Vision" },
	{ key: "tools", Icon: Wrench, label: "Tools" },
	{ key: "reasoning", Icon: Brain, label: "Reasoning" },
	{ key: "audio", Icon: AudioLines, label: "Audio" },
	{ key: "embeddings", Icon: Network, label: "Embeddings" },
];

function CapabilityIcons({ caps }: { caps: string[] | null | undefined }) {
	if (!caps || caps.length === 0) return null;
	const set = new Set(caps);
	const active = CAPS.filter((c) => set.has(c.key));
	if (active.length === 0) return null;
	return (
		<div className="flex items-center gap-1 text-muted-foreground shrink-0">
			{active.map(({ key, Icon, label }) => (
				<Icon key={key} className="w-3.5 h-3.5" aria-label={label} />
			))}
		</div>
	);
}

function pickContextWindow(
	model: PolicyModelView["model"],
): string | undefined {
	const n = model.contextWindowTotal ?? model.contextWindowInput ?? undefined;
	if (!n || n <= 0) return undefined;
	if (n >= 1_000_000) {
		const m = n / 1_000_000;
		return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
	}
	if (n >= 1_000) {
		return `${Math.round(n / 1_000)}K`;
	}
	return `${n}`;
}

function DeprecationBadge({ status }: { status: string }) {
	const label = status.toLowerCase() === "sunset" ? "Sunset" : "Deprecated";
	return (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide bg-warning/10 text-warning border border-warning/30 whitespace-nowrap">
			{label}
		</span>
	);
}

function hostLabel(row: PolicyModelView | undefined): string {
	const host = row?.host;
	if (!host) return "";
	return host.displayName?.trim() || host.name;
}

function EmptyState({ title, message }: { title: string; message: string }) {
	return (
		<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center mt-2">
			<div className="text-sm font-medium text-foreground">{title}</div>
			<div className="mt-0.5 text-xs text-muted-foreground">{message}</div>
		</div>
	);
}
