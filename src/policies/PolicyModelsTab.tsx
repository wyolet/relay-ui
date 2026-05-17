import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useHosts } from "@/api/hooks/hosts";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import type { Host } from "@/api/types/host";
import type { Policy } from "@/api/types/policy";
import { HostLogo } from "@/hosts/HostLogo";
import {
	type ConcreteBinding,
	parseCatalogRef,
	refCovers,
	validateCatalogRef,
} from "@/lib/catalogRef";
import { buildConcreteCatalog } from "@/lib/concreteCatalog";
import { displayLabel } from "@/lib/displayLabel";

interface Props {
	policy: Policy;
}

/**
 * Host-grouped view of the policy's effective catalog. Each host that the
 * policy can route to is a card, with the list of models it serves under
 * the current grants. Mirrors the operator's mental model: a request hits
 * a host, which serves a model.
 */
export function PolicyModelsTab({ policy }: Props) {
	const { data: providers } = useProviders();
	const { data: models } = useModels();
	const { data: hostsData } = useHosts();

	const catalog = useMemo(
		() =>
			buildConcreteCatalog({
				providers: providers.items ?? [],
				models: models.items ?? [],
				hosts: hostsData.items ?? [],
				includeDeprecated: policy.spec.includeDeprecated ?? false,
			}),
		[providers, models, hostsData, policy.spec.includeDeprecated],
	);

	const hostBySlug = useMemo(() => {
		const m = new Map<string, Host>();
		for (const h of hostsData.items ?? []) m.set(h.metadata.name, h);
		return m;
	}, [hostsData]);

	const grants = policy.spec.models ?? [];

	const groupedByHost = useMemo(() => {
		const granted = new Set<string>(); // key: provider/model@host
		const refsThatHit = new Map<string, Set<string>>(); // key → ref strings that contributed
		for (const raw of grants) {
			if (validateCatalogRef(raw)) continue;
			const parsed = parseCatalogRef(raw);
			for (const b of catalog) {
				if (!refCovers(parsed, b)) continue;
				const key = `${b.provider}/${b.model}@${b.host}`;
				granted.add(key);
				const set = refsThatHit.get(key) ?? new Set<string>();
				set.add(raw);
				refsThatHit.set(key, set);
			}
		}

		const byHost = new Map<string, ConcreteBinding[]>();
		for (const b of catalog) {
			const key = `${b.provider}/${b.model}@${b.host}`;
			if (!granted.has(key)) continue;
			const list = byHost.get(b.host) ?? [];
			list.push(b);
			byHost.set(b.host, list);
		}
		for (const list of byHost.values()) {
			list.sort(
				(a, b) =>
					a.provider.localeCompare(b.provider) ||
					a.model.localeCompare(b.model),
			);
		}
		return { byHost, refsThatHit };
	}, [catalog, grants]);

	if (grants.length === 0) {
		return (
			<EmptyState
				title="No catalog refs"
				message="This policy currently grants nothing. Add catalog refs in the edit form."
			/>
		);
	}

	if (groupedByHost.byHost.size === 0) {
		return (
			<EmptyState
				title="No reachable models"
				message="The catalog refs on this policy don't match any model currently in the catalog. They may match models added later, or you may need to revisit them."
			/>
		);
	}

	// Sort hosts: ones with most models first feels weird for a detail view;
	// sort alphabetically by slug so it's stable across renders.
	const hostSlugs = [...groupedByHost.byHost.keys()].sort();
	const distinctModels = new Set<string>();
	for (const list of groupedByHost.byHost.values()) {
		for (const b of list) distinctModels.add(`${b.provider}/${b.model}`);
	}

	return (
		<div className="flex flex-col gap-4 pt-2">
			<div className="text-[11px] text-muted-foreground">
				Grouped by host. {grants.length} catalog grant
				{grants.length === 1 ? "" : "s"} reach{" "}
				<span className="text-foreground tabular-nums">
					{distinctModels.size}
				</span>{" "}
				model{distinctModels.size === 1 ? "" : "s"} across{" "}
				<span className="text-foreground tabular-nums">{hostSlugs.length}</span>{" "}
				host{hostSlugs.length === 1 ? "" : "s"}.
			</div>

			{hostSlugs.map((hostSlug) => {
				const host = hostBySlug.get(hostSlug);
				const bindings = groupedByHost.byHost.get(hostSlug) ?? [];
				return (
					<HostGroup
						key={hostSlug}
						host={host}
						hostSlug={hostSlug}
						bindings={bindings}
					/>
				);
			})}
		</div>
	);
}

interface HostGroupProps {
	host: Host | undefined;
	hostSlug: string;
	bindings: ConcreteBinding[];
}

const COLLAPSE_THRESHOLD = 6;

function HostGroup({ host, hostSlug, bindings }: HostGroupProps) {
	const hostEnabled = host ? host.spec.enabled !== false : false;
	const [expanded, setExpanded] = useState(false);
	const showToggle = bindings.length > COLLAPSE_THRESHOLD;
	const visible = expanded ? bindings : bindings.slice(0, COLLAPSE_THRESHOLD);
	const hiddenCount = bindings.length - visible.length;

	return (
		<section className="rounded-md border border-border bg-card overflow-hidden">
			<header className="flex items-center gap-3 px-3 py-2 border-b border-border bg-muted/30">
				{host ? (
					<HostLogo host={host} size={20} />
				) : (
					<div className="w-5 h-5 rounded bg-muted" aria-hidden />
				)}
				<div className="min-w-0 flex-1">
					<div className="text-sm font-medium text-foreground truncate">
						{host ? displayLabel(host.metadata) : hostSlug}
					</div>
					<div className="text-[11px] text-muted-foreground truncate font-mono">
						{hostSlug}
					</div>
				</div>
				{host ? (
					<HostBadge enabled={hostEnabled} />
				) : (
					<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/30">
						Missing
					</span>
				)}
				<span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
					{bindings.length} model{bindings.length === 1 ? "" : "s"}
				</span>
			</header>

			<ul className="divide-y divide-border">
				{visible.map((b) => (
					<li
						key={`${b.provider}/${b.model}`}
						className="flex items-center gap-3 px-3 py-1.5 text-sm hover:bg-muted/40"
					>
						<div className="flex-1 min-w-0">
							<Link
								to="/models/$name"
								params={{ name: b.model }}
								className="font-mono text-foreground text-[13px] hover:underline"
							>
								{b.model}
							</Link>
							<span className="ml-1.5 text-[10px] text-muted-foreground capitalize">
								{b.provider}
							</span>
						</div>
					</li>
				))}
			</ul>

			{showToggle && (
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					className="w-full px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center justify-center gap-1 border-t border-border"
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
				</button>
			)}
		</section>
	);
}

function HostBadge({ enabled }: { enabled: boolean }) {
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

function EmptyState({ title, message }: { title: string; message: string }) {
	return (
		<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center mt-2">
			<div className="text-sm font-medium text-foreground">{title}</div>
			<div className="mt-0.5 text-xs text-muted-foreground">{message}</div>
		</div>
	);
}
