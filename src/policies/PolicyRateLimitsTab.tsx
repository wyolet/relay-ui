import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Gauge } from "lucide-react";
import { useMemo, useState } from "react";
import { useHosts } from "@/api/hooks/hosts";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import { useRateLimits } from "@/api/hooks/ratelimits";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import type { RateLimit, RateLimitRule } from "@/api/types/ratelimit";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HostLogo } from "@/hosts/HostLogo";
import {
	parseCatalogRef,
	refCovers,
	refsOverlap,
	validateCatalogRef,
} from "@/lib/catalogRef";
import { buildConcreteCatalog } from "@/lib/concreteCatalog";
import { displayLabel } from "@/lib/displayLabel";
import { compactNumber } from "@/lib/rateLimitFormat";
import { nsToSec } from "@/lib/timeWindow";
import { PolicyRLOverlapWarning } from "@/policies/PolicyRLOverlapWarning";
import { usePolicyRLResolution } from "@/policies/usePolicyRLResolution";
import { usePolicyUnthrottledModels } from "@/policies/usePolicyUnthrottledModels";
import { AlertBanner } from "@/shared/AlertBanner";

interface Props {
	policy: Policy;
}

/**
 * One panel per rate limit attached to the policy. Layout: rules on the
 * left as a definition list (Token / Request / Other groups), models on
 * the right grouped by host in a collapsible scroll area.
 */
export function PolicyRateLimitsTab({ policy }: Props) {
	const { data: rateLimitsData } = useRateLimits();
	const { data: providers } = useProviders();
	const { data: models } = useModels();
	const { data: hosts } = useHosts();

	const rlById = useMemo(() => {
		const m = new Map<string, RateLimit>();
		for (const rl of rateLimitsData.items ?? []) {
			if (rl.metadata.id) m.set(rl.metadata.id, rl);
		}
		return m;
	}, [rateLimitsData]);

	const catalog = useMemo(
		() =>
			buildConcreteCatalog({
				providers: providers.items ?? [],
				models: models.items ?? [],
				hosts: hosts.items ?? [],
				includeDeprecated: policy.spec.includeDeprecated ?? false,
			}),
		[providers, models, hosts, policy.spec.includeDeprecated],
	);

	const modelBySlug = useMemo(() => {
		const m = new Map<string, Model>();
		for (const x of models.items ?? []) m.set(x.metadata.name, x);
		return m;
	}, [models]);

	const hostBySlug = useMemo(() => {
		const m = new Map<string, Host>();
		for (const h of hosts.items ?? []) m.set(h.metadata.name, h);
		return m;
	}, [hosts]);

	const bindings = policy.spec.rlBindings ?? [];
	const globalId = policy.spec.rateLimitId;

	const grantRefs = useMemo(
		() =>
			(policy.spec.models ?? [])
				.filter((g) => !validateCatalogRef(g))
				.map((g) => parseCatalogRef(g)),
		[policy.spec.models],
	);

	function orphansFor(refs: readonly string[]): string[] {
		return refs.filter((raw) => {
			if (validateCatalogRef(raw)) return false;
			const scope = parseCatalogRef(raw);
			return !grantRefs.some((g) => refsOverlap(g, scope));
		});
	}

	if (!globalId && bindings.length === 0) {
		return (
			<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center mt-2">
				<div className="text-sm font-medium text-foreground">
					No rate limits attached
				</div>
				<div className="mt-0.5 text-xs text-muted-foreground">
					Requests through this policy are not rate-limited beyond upstream
					provider quotas.
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 pt-2">
			<OverlapBanner policy={policy} />
			<UnthrottledModelsPanel policy={policy} />
			{globalId && (
				<RateLimitPanel
					isDefault
					subtitle="Applies to every catalog ref in this policy."
					rateLimit={rlById.get(globalId)}
					rateLimitId={globalId}
					refs={policy.spec.models ?? []}
					catalog={catalog}
					modelBySlug={modelBySlug}
					hostBySlug={hostBySlug}
				/>
			)}
			{bindings.map((b, i) => {
				const refs = b.models ?? [];
				const orphans = orphansFor(refs);
				const fullyOrphaned = refs.length > 0 && orphans.length === refs.length;
				return (
					<RateLimitPanel
						// biome-ignore lint/suspicious/noArrayIndexKey: bindings array is stable per render
						key={`${b.rateLimitId}:${i}`}
						rateLimit={b.rateLimitId ? rlById.get(b.rateLimitId) : undefined}
						rateLimitId={b.rateLimitId}
						refs={refs}
						catalog={catalog}
						modelBySlug={modelBySlug}
						hostBySlug={hostBySlug}
						orphans={fullyOrphaned ? orphans : []}
					/>
				);
			})}
		</div>
	);
}

function UnthrottledModelsPanel({ policy }: { policy: Policy }) {
	const { rows } = usePolicyUnthrottledModels(policy);
	if (rows.length === 0) return null;
	return (
		<AlertBanner
			severity="info"
			title={`${rows.length} model${rows.length === 1 ? "" : "s"} pass without rate limits`}
			body={
				<table className="w-full text-[11px]">
					<thead className="bg-sky-500/10 text-muted-foreground">
						<tr>
							<th
								scope="col"
								className="px-3 py-1.5 text-left font-medium text-[10px] uppercase tracking-wide"
							>
								Model
							</th>
							<th
								scope="col"
								className="px-3 py-1.5 text-left font-medium text-[10px] uppercase tracking-wide"
							>
								Hosts
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => (
							<tr
								key={`${r.provider}/${r.model}`}
								className="border-t border-sky-500/20"
							>
								<td className="px-3 py-1.5">
									<span className="text-foreground">{r.modelLabel}</span>
									<code className="ml-1.5 font-mono text-[10px] text-muted-foreground">
										{r.provider}/{r.model}
									</code>
								</td>
								<td className="px-3 py-1.5 text-foreground">
									{r.hosts.map((h) => h.label).join(", ")}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			}
		>
			These models are granted by the policy's catalog but no rate-limit binding
			covers them. Requests will pass without throttling — fine if intentional,
			otherwise scope a rate limit at them.
		</AlertBanner>
	);
}

function OverlapBanner({ policy }: { policy: Policy }) {
	const allBindings = useMemo(() => {
		const out: { rateLimitId: string; models: string[] }[] = [];
		if (policy.spec.rateLimitId) {
			out.push({
				rateLimitId: policy.spec.rateLimitId,
				models: policy.spec.models ?? [],
			});
		}
		for (const b of policy.spec.rlBindings ?? []) {
			if (b.rateLimitId)
				out.push({ rateLimitId: b.rateLimitId, models: b.models ?? [] });
		}
		return out;
	}, [policy]);

	const { resolution, labels, rlMetaById } = usePolicyRLResolution(
		allBindings,
		policy.spec.includeDeprecated ?? false,
	);

	if (resolution.carveouts.length === 0) return null;
	return (
		<PolicyRLOverlapWarning
			carveouts={resolution.carveouts}
			bindings={allBindings}
			rlMetaById={rlMetaById}
			labels={labels}
		/>
	);
}

interface PanelProps {
	isDefault?: boolean;
	subtitle?: string;
	rateLimit: RateLimit | undefined;
	rateLimitId: string | undefined;
	refs: readonly string[];
	catalog: ReturnType<typeof buildConcreteCatalog>;
	modelBySlug: Map<string, Model>;
	hostBySlug: Map<string, Host>;
	orphans?: readonly string[];
}

function RateLimitPanel({
	isDefault,
	subtitle,
	rateLimit,
	rateLimitId,
	refs,
	catalog,
	modelBySlug,
	hostBySlug,
	orphans = [],
}: PanelProps) {
	const rules = rateLimit?.spec.rules ?? [];
	const ruleGroups = useMemo(() => groupRules(rules), [rules]);

	const resolved = useMemo(
		() => resolveModels(refs, catalog, modelBySlug, hostBySlug),
		[refs, catalog, modelBySlug, hostBySlug],
	);
	const grouped = useMemo(() => groupByHost(resolved), [resolved]);
	const totalModels = resolved.length;
	const totalHosts = grouped.length;
	const providerCount = useMemo(() => {
		const s = new Set<string>();
		for (const m of resolved) s.add(m.provider);
		return s.size;
	}, [resolved]);
	const defaultOpen = useMemo<Set<string>>(() => {
		const first = grouped[0]?.host.metadata.name;
		return first ? new Set([first]) : new Set();
	}, [grouped]);
	const [userOpen, setUserOpen] = useState<Set<string> | null>(null);
	const openHosts = userOpen ?? defaultOpen;
	const toggleHost = (slug: string) =>
		setUserOpen(() => {
			const next = new Set(openHosts);
			if (next.has(slug)) next.delete(slug);
			else next.add(slug);
			return next;
		});
	const allOpen = openHosts.size === grouped.length && grouped.length > 0;
	const toggleAll = () =>
		setUserOpen(
			allOpen ? new Set() : new Set(grouped.map((g) => g.host.metadata.name)),
		);

	const hasOrphans = orphans.length > 0;

	return (
		<section
			className={`rounded-md border bg-card overflow-hidden ${
				hasOrphans ? "border-amber-500/40" : "border-border"
			}`}
		>
			{hasOrphans && (
				<div className="border-b border-amber-500/30 bg-amber-500/5 px-3 py-2">
					<AlertBanner severity="warn">
						This rate limit targets{" "}
						{orphans.map((m, i) => (
							<span key={m}>
								{i > 0 && ", "}
								<code className="font-mono text-foreground">"{m}"</code>
							</span>
						))}
						{orphans.length === 1 ? ", which isn't" : ", which aren't"} in this
						policy's catalog. Remove this rate limit, or add{" "}
						{orphans.length === 1 ? "it" : "them"} to the policy's models.
					</AlertBanner>
				</div>
			)}
			<header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
				<Gauge className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 min-w-0">
						{rateLimit ? (
							<Link
								to="/policies/rate-limits/$name"
								params={{ name: rateLimit.metadata.name }}
								className="text-sm text-foreground hover:underline truncate"
							>
								{displayLabel(rateLimit.metadata)}
							</Link>
						) : rateLimitId ? (
							<span className="text-destructive font-mono text-[11px]">
								missing ({rateLimitId.slice(0, 6)}…)
							</span>
						) : (
							<span className="text-muted-foreground text-[11px]">unset</span>
						)}
						{isDefault && (
							<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide bg-muted text-muted-foreground border border-border">
								default
							</span>
						)}
					</div>
					{subtitle && (
						<div className="text-[11px] text-muted-foreground">{subtitle}</div>
					)}
				</div>
			</header>

			{rules.length === 0 ? (
				<div className="px-3 py-3 text-xs text-muted-foreground">
					Rate limit has no rules configured.
				</div>
			) : resolved.length === 0 ? (
				<div className="px-3 py-3 text-xs text-muted-foreground">
					Doesn't match any current model.
				</div>
			) : (
				<div className="grid grid-cols-[200px_1fr]">
					<aside className="border-r border-border p-3 space-y-3 bg-muted/10">
						{ruleGroups.map((g) => (
							<div key={g.label}>
								<div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
									{g.label}
								</div>
								<ul className="space-y-0.5">
									{g.rules.map((rule, i) => (
										<li
											// biome-ignore lint/suspicious/noArrayIndexKey: rules per group are stable
											key={`${rule.meter}:${rule.window}:${i}`}
											className="text-[12px] tabular-nums text-foreground"
										>
											<span className="font-mono">
												{compactNumber(rule.amount)}
											</span>{" "}
											<span className="text-muted-foreground font-mono text-[10px]">
												{ruleShortTag(rule.meter, nsToSec(rule.window)) ??
													`${rule.meter}/${nsToSec(rule.window)}s`}
											</span>
										</li>
									))}
								</ul>
							</div>
						))}
					</aside>
					<div className="flex flex-col">
						<div className="px-3 py-2 border-b border-border bg-muted/5 flex items-center gap-2 text-[10px] text-muted-foreground">
							<span className="font-semibold uppercase tracking-wide text-foreground tabular-nums">
								{totalModels}
							</span>
							<span>model{totalModels === 1 ? "" : "s"}</span>
							<span className="text-muted-foreground/50">·</span>
							<span className="font-semibold uppercase tracking-wide text-foreground tabular-nums">
								{totalHosts}
							</span>
							<span>host{totalHosts === 1 ? "" : "s"}</span>
							<span className="text-muted-foreground/50">·</span>
							<span className="font-semibold uppercase tracking-wide text-foreground tabular-nums">
								{providerCount}
							</span>
							<span>provider{providerCount === 1 ? "" : "s"}</span>
							<button
								type="button"
								onClick={toggleAll}
								className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
							>
								{allOpen ? "Collapse all" : "Expand all"}
							</button>
						</div>
						<ScrollArea className="min-h-[180px] max-h-[320px]">
							<ul className="divide-y divide-border">
								{grouped.map((g) => {
									const isOpen = openHosts.has(g.host.metadata.name);
									return (
										<li key={g.host.metadata.name}>
											<button
												type="button"
												onClick={() => toggleHost(g.host.metadata.name)}
												aria-expanded={isOpen}
												className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
											>
												{isOpen ? (
													<ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
												) : (
													<ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
												)}
												<HostLogo host={g.host} size={18} />
												<div className="min-w-0 flex-1">
													<div className="text-[12px] text-foreground truncate">
														<span className="tabular-nums">
															{g.models.length}
														</span>{" "}
														model{g.models.length === 1 ? "" : "s"} hosted by{" "}
														<span className="font-medium">
															{displayLabel(g.host.metadata)}
														</span>
													</div>
													<div className="text-[10px] text-muted-foreground font-mono truncate">
														{g.host.metadata.name}
														{g.providers.length > 0 && (
															<>
																{" · "}
																<span className="capitalize">
																	{g.providers.join(", ")}
																</span>
															</>
														)}
													</div>
												</div>
											</button>
											{isOpen && (
												<ul className="px-3 pb-2 pl-9 space-y-1">
													{g.models.map((m) => (
														<li
															key={`${m.provider}/${m.model}`}
															className="flex items-baseline gap-2 min-w-0"
														>
															{m.label !== m.model && (
																<span className="text-[12px] text-foreground truncate">
																	{m.label}
																</span>
															)}
															<code className="font-mono text-[10px] text-muted-foreground truncate">
																{m.model}
															</code>
														</li>
													))}
												</ul>
											)}
										</li>
									);
								})}
							</ul>
						</ScrollArea>
					</div>
				</div>
			)}
		</section>
	);
}

interface RuleGroup {
	label: string;
	rules: RateLimitRule[];
}

function groupRules(rules: readonly RateLimitRule[]): RuleGroup[] {
	const tokens: RuleGroup = { label: "Token limits", rules: [] };
	const requests: RuleGroup = { label: "Request limits", rules: [] };
	const other: RuleGroup = { label: "Other limits", rules: [] };
	for (const r of rules) {
		if (r.meter.startsWith("tokens")) tokens.rules.push(r);
		else if (r.meter === "requests") requests.rules.push(r);
		else other.rules.push(r);
	}
	return [tokens, requests, other].filter((g) => g.rules.length > 0);
}

const WINDOW_LETTER: Record<number, string> = {
	1: "S",
	60: "M",
	3600: "H",
	86400: "D",
};

function ruleShortTag(meter: string, seconds: number): string | undefined {
	const w = WINDOW_LETTER[seconds];
	if (!w) return undefined;
	switch (meter) {
		case "requests":
			return `RP${w}`;
		case "tokens":
			return `TP${w}`;
		case "concurrency":
			return `CP${w}`;
		case "tokens.input":
			return `TinP${w}`;
		case "tokens.output":
			return `ToutP${w}`;
		case "tokens.cache_read":
			return `TcrP${w}`;
		case "tokens.cache_creation":
			return `TccP${w}`;
		case "tokens.reasoning":
			return `TrsnP${w}`;
		default:
			return `${meter}/${w}`;
	}
}

interface ResolvedModel {
	provider: string;
	model: string;
	label: string;
	hosts: { slug: string; host: Host }[];
}

function resolveModels(
	refs: readonly string[],
	catalog: ReturnType<typeof buildConcreteCatalog>,
	modelBySlug: Map<string, Model>,
	hostBySlug: Map<string, Host>,
): ResolvedModel[] {
	const byKey = new Map<string, ResolvedModel>();
	for (const raw of refs) {
		if (validateCatalogRef(raw)) continue;
		const parsed = parseCatalogRef(raw);
		for (const b of catalog) {
			if (!refCovers(parsed, b)) continue;
			const key = `${b.provider}/${b.model}`;
			let entry = byKey.get(key);
			if (!entry) {
				const model = modelBySlug.get(b.model);
				entry = {
					provider: b.provider,
					model: b.model,
					label: model ? displayLabel(model.metadata) : b.model,
					hosts: [],
				};
				byKey.set(key, entry);
			}
			const host = hostBySlug.get(b.host);
			if (host && !entry.hosts.some((h) => h.slug === b.host)) {
				entry.hosts.push({ slug: b.host, host });
			}
		}
	}
	const out = [...byKey.values()];
	out.sort(
		(a, b) =>
			a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model),
	);
	return out;
}

interface HostGroup {
	host: Host;
	models: { provider: string; model: string; label: string }[];
	providers: string[];
}

function groupByHost(models: ResolvedModel[]): HostGroup[] {
	const byHost = new Map<string, HostGroup>();
	for (const m of models) {
		for (const h of m.hosts) {
			let g = byHost.get(h.slug);
			if (!g) {
				g = { host: h.host, models: [], providers: [] };
				byHost.set(h.slug, g);
			}
			g.models.push({ provider: m.provider, model: m.model, label: m.label });
			if (!g.providers.includes(m.provider)) g.providers.push(m.provider);
		}
	}
	for (const g of byHost.values()) {
		g.models.sort(
			(a, b) =>
				a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model),
		);
		g.providers.sort();
	}
	return [...byHost.values()].sort((a, b) =>
		displayLabel(a.host.metadata).localeCompare(displayLabel(b.host.metadata)),
	);
}
