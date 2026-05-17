import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Gauge, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { useHosts } from "@/api/hooks/hosts";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import { useRateLimits } from "@/api/hooks/ratelimits";
import type { Policy } from "@/api/types/policy";
import type { RateLimit, RateLimitRule } from "@/api/types/ratelimit";
import {
	parseCatalogRef,
	refCovers,
	refsOverlap,
	validateCatalogRef,
} from "@/lib/catalogRef";
import { buildConcreteCatalog } from "@/lib/concreteCatalog";
import { displayLabel } from "@/lib/displayLabel";
import { formatRuleShort } from "@/lib/rateLimitFormat";
import { nsToSec } from "@/lib/timeWindow";
import { PolicyRLOverlapWarning } from "@/policies/PolicyRLOverlapWarning";
import { usePolicyRLResolution } from "@/policies/usePolicyRLResolution";
import { usePolicyUnthrottledModels } from "@/policies/usePolicyUnthrottledModels";
import { AlertBanner } from "@/shared/AlertBanner";

interface Props {
	policy: Policy;
}

/**
 * Per-binding tables. Each binding picks a RL and a list of catalog refs;
 * we resolve those refs to concrete models against the local catalog and
 * render a table with one column per RL rule (the window/meter pair).
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
		<div className="flex flex-col gap-5 pt-2">
			<OverlapBanner policy={policy} />
			<UnthrottledModelsPanel policy={policy} />
			{globalId && (
				<BindingPanel
					title="Default"
					subtitle="Applies to every catalog ref in this policy."
					rateLimit={rlById.get(globalId)}
					rateLimitId={globalId}
					refs={policy.spec.models ?? []}
					catalog={catalog}
				/>
			)}
			{bindings.map((b, i) => {
				const refs = b.models ?? [];
				const orphans = orphansFor(refs);
				const fullyOrphaned = refs.length > 0 && orphans.length === refs.length;
				return (
					<BindingPanel
						key={`${b.rateLimitId}:${i}`}
						title={`Rate limit ${i + 1}`}
						rateLimit={b.rateLimitId ? rlById.get(b.rateLimitId) : undefined}
						rateLimitId={b.rateLimitId}
						refs={refs}
						catalog={catalog}
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
			These models are granted by the policy's catalog but no rate-limit
			binding covers them. Requests will pass without throttling — fine if
			intentional, otherwise scope a rate limit at them.
		</AlertBanner>
	);
}

function OverlapBanner({ policy }: { policy: Policy }) {
	const allBindings = useMemo(() => {
		const out: { rateLimitId: string; models: string[] }[] = [];
		// Global default first: scopes to the entire policy's catalog.
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

interface BindingPanelProps {
	title: string;
	subtitle?: string;
	rateLimit: RateLimit | undefined;
	rateLimitId: string | undefined;
	refs: readonly string[];
	catalog: ReturnType<typeof buildConcreteCatalog>;
	/** Refs that aren't covered by the policy's catalog grants. Non-empty → render a warning. */
	orphans?: readonly string[];
}

const COLLAPSE_THRESHOLD = 6;

function BindingPanel({
	title,
	subtitle,
	rateLimit,
	rateLimitId,
	refs,
	catalog,
	orphans = [],
}: BindingPanelProps) {
	const rules = rateLimit?.spec.rules ?? [];
	const models = useMemo(
		() => resolveModelNames(refs, catalog),
		[refs, catalog],
	);
	const [expanded, setExpanded] = useState(false);
	const visible = expanded ? models : models.slice(0, COLLAPSE_THRESHOLD);
	const showToggle = models.length > COLLAPSE_THRESHOLD;
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
			<header className="flex items-center gap-3 px-3 py-2 border-b border-border bg-muted/30">
				<Gauge className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
				<div className="min-w-0">
					<div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
						{title}
					</div>
					{subtitle && (
						<div className="text-[11px] text-muted-foreground">{subtitle}</div>
					)}
				</div>
				<div className="ml-auto text-sm">
					{rateLimit ? (
						<Link
							to="/policies/rate-limits/$name"
							params={{ name: rateLimit.metadata.name }}
							className="text-foreground hover:underline"
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
				</div>
			</header>

			{rules.length === 0 ? (
				<div className="px-3 py-3 text-xs text-muted-foreground">
					Rate limit has no rules configured.
				</div>
			) : models.length === 0 ? (
				<div className="px-3 py-3 text-xs text-muted-foreground">
					Doesn't match any current model — the rules below won't apply until
					catalog catches up.
					<RuleSummaryChips rules={rules} />
				</div>
			) : (
				<RateLimitTable
					rules={rules}
					models={visible}
					expanded={expanded}
					hiddenCount={models.length - visible.length}
					showToggle={showToggle}
					onToggle={() => setExpanded((v) => !v)}
				/>
			)}
		</section>
	);
}

function RuleSummaryChips({ rules }: { rules: readonly RateLimitRule[] }) {
	return (
		<div className="mt-3 flex flex-wrap gap-2">
			{rules.map((r, i) => (
				<span
					key={`${r.meter}:${r.window}:${i}`}
					className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-foreground text-[11px] tabular-nums font-mono"
				>
					{formatRuleShort(r)}
				</span>
			))}
		</div>
	);
}

/**
 * OpenAI-style table. Columns are grouped into semantic buckets (Token / Request),
 * one column per (meter, window) within a bucket. Cells show the raw amount + short code.
 */
interface RuleGroup {
	label: string;
	rules: { rule: RateLimitRule; originalIndex: number }[];
}

function groupRules(rules: readonly RateLimitRule[]): RuleGroup[] {
	const tokens: RuleGroup = { label: "Token limits", rules: [] };
	const requests: RuleGroup = { label: "Request limits", rules: [] };
	const other: RuleGroup = { label: "Other limits", rules: [] };
	rules.forEach((rule, i) => {
		if (rule.meter.startsWith("tokens"))
			tokens.rules.push({ rule, originalIndex: i });
		else if (rule.meter === "requests")
			requests.rules.push({ rule, originalIndex: i });
		else other.rules.push({ rule, originalIndex: i });
	});
	return [tokens, requests, other].filter((g) => g.rules.length > 0);
}

function ruleColumnHeader(rule: RateLimitRule): string {
	const seconds = nsToSec(rule.window);
	const tag = ruleShortTag(rule.meter, seconds);
	if (tag) return tag;
	// Fallback: full meter, custom window.
	return `${rule.meter}/${seconds}s`;
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

interface RateLimitTableProps {
	rules: readonly RateLimitRule[];
	models: ResolvedModel[];
	expanded: boolean;
	hiddenCount: number;
	showToggle: boolean;
	onToggle: () => void;
}

function RateLimitTable({
	rules,
	models,
	expanded,
	hiddenCount,
	showToggle,
	onToggle,
}: RateLimitTableProps) {
	const groups = useMemo(() => groupRules(rules), [rules]);

	return (
		<>
			<div className="px-3 py-2 flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/10 border-b border-border">
				<Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
				<span>
					Limits apply per model on each host. Expand to see every model this
					rate limit covers in the policy.
				</span>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border">
							<th
								className="text-left font-medium px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"
								rowSpan={2}
							>
								Model
							</th>
							{groups.map((g) => (
								<th
									key={g.label}
									colSpan={g.rules.length}
									className="text-center font-medium px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground border-l border-border"
								>
									{g.label}
								</th>
							))}
						</tr>
						<tr className="border-b border-border bg-muted/20">
							{groups.flatMap((g, gi) =>
								g.rules.map(({ rule, originalIndex }, ri) => (
									<th
										key={`${gi}:${originalIndex}`}
										className={`text-right font-mono font-medium px-3 py-1 text-[10px] text-muted-foreground tabular-nums whitespace-nowrap ${ri === 0 ? "border-l border-border" : ""}`}
									>
										{ruleColumnHeader(rule)}
									</th>
								)),
							)}
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{models.map((m) => (
							<tr
								key={`${m.provider}/${m.model}`}
								className="hover:bg-muted/40"
							>
								<td className="px-3 py-2 align-top">
									<div className="font-mono text-foreground text-[13px]">
										{m.model}
									</div>
									<div className="text-[10px] text-muted-foreground capitalize mt-0.5">
										{m.provider}
									</div>
								</td>
								{groups.flatMap((g, gi) =>
									g.rules.map(({ rule, originalIndex }, ri) => (
										<td
											key={`${gi}:${originalIndex}`}
											className={`px-3 py-2 text-right tabular-nums text-foreground whitespace-nowrap ${ri === 0 ? "border-l border-border" : ""}`}
										>
											<span>{rule.amount.toLocaleString()}</span>
											<span className="text-muted-foreground text-[11px] font-mono ml-1">
												{ruleColumnHeader(rule)}
											</span>
										</td>
									)),
								)}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{showToggle && (
				<button
					type="button"
					onClick={onToggle}
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
		</>
	);
}

interface ResolvedModel {
	provider: string;
	model: string;
}

function resolveModelNames(
	refs: readonly string[],
	catalog: ReturnType<typeof buildConcreteCatalog>,
): ResolvedModel[] {
	const seen = new Set<string>();
	const out: ResolvedModel[] = [];
	for (const raw of refs) {
		if (validateCatalogRef(raw)) continue;
		const parsed = parseCatalogRef(raw);
		for (const b of catalog) {
			if (!refCovers(parsed, b)) continue;
			const key = `${b.provider}/${b.model}`;
			if (seen.has(key)) continue;
			seen.add(key);
			out.push({ provider: b.provider, model: b.model });
		}
	}
	out.sort(
		(a, b) =>
			a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model),
	);
	return out;
}
