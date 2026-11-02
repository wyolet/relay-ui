import { Link } from "@tanstack/react-router";
import { Gauge, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import type { RateLimit, RateLimitRule } from "@/api/types/ratelimit";
import { IssuesPanel } from "@/diagnostics/IssuesPanel";
import { useRateLimitDiagnostics } from "@/diagnostics/useDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { compactNumber } from "@/lib/rateLimitFormat";
import { isProviderOwned, isSystemOwned } from "@/lib/systemRateLimits";
import { windowLabel } from "@/lib/timeWindow";
import { useRateLimitReferences } from "@/rate-limits/useRateLimitReferences";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailTable, Td } from "@/shared/DetailTable";
import { EmptyPanel } from "@/shared/EmptyPanel";
import { SectionTitle } from "@/shared/SectionTitle";
import {
	CatalogDetachedBadge,
	OwnerBadge,
	StatusBadge,
} from "@/shared/StatusBadge";

interface Props {
	rateLimit: RateLimit;
	onDelete: () => void;
	onToggleEnabled: () => void;
	deleting?: boolean;
	toggling?: boolean;
}

export function RateLimitDetailView({
	rateLimit,
	onDelete,
	onToggleEnabled,
	deleting,
	toggling,
}: Props) {
	return (
		<div className="flex flex-col gap-6">
			<Header
				rateLimit={rateLimit}
				onDelete={onDelete}
				onToggleEnabled={onToggleEnabled}
				deleting={deleting}
				toggling={toggling}
			/>
			<RateLimitIssues rateLimitId={rateLimit.metadata.id} />
			<RulesPanel rules={rateLimit.spec.rules ?? []} />
			<PoliciesPanel rateLimit={rateLimit} />
		</div>
	);
}

function Header({
	rateLimit,
	onDelete,
	onToggleEnabled,
	deleting,
	toggling,
}: Omit<Props, never>) {
	const name = rateLimit.metadata.name;
	const enabled = rateLimit.spec.enabled !== false;
	const system = isSystemOwned(rateLimit);
	const provider = isProviderOwned(rateLimit);
	const canMutate = !system;

	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0">
				<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
					<Gauge
						className="w-4 h-4 text-muted-foreground shrink-0"
						aria-hidden
					/>
					{displayLabel(rateLimit.metadata)}
					{!hasDisplayName(rateLimit.metadata) && (
						<span className="text-[11px] text-muted-foreground font-normal">
							(no display name)
						</span>
					)}
					<StatusBadge enabled={enabled} />
					{system && <OwnerBadge label="System" />}
					{provider && <OwnerBadge label="Provider" />}
					<CatalogDetachedBadge
						detachedAt={rateLimit.metadata.catalogDetachedAt}
					/>
				</h1>
				<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
					{name}
				</p>
				{rateLimit.metadata.description && (
					<p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
						{rateLimit.metadata.description}
					</p>
				)}
			</div>
			{canMutate && (
				<DetailHeaderActions
					enabled={enabled}
					onToggle={onToggleEnabled}
					toggling={toggling}
					onDelete={onDelete}
					deleting={deleting}
					editLink={({ className, content }) => (
						<Link
							to="/policies/rate-limits/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				/>
			)}
		</div>
	);
}

function RulesPanel({ rules }: { rules: readonly RateLimitRule[] }) {
	const groups = useMemo(() => groupRules(rules), [rules]);
	return (
		<section>
			<SectionTitle>Rules</SectionTitle>
			{rules.length === 0 ? (
				<EmptyPanel title="No rules configured">
					This rate limit will never throttle. Add a rule to enforce a quota.
				</EmptyPanel>
			) : (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{groups.map((g) => (
						<div
							key={g.label}
							className="rounded-md border border-border bg-card overflow-hidden"
						>
							<header className="px-3 py-1.5 border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
								{g.label}
							</header>
							<ul className="divide-y divide-border">
								{g.rules.map((rule, i) => (
									<li
										// biome-ignore lint/suspicious/noArrayIndexKey: stable per group
										key={`${rule.meter}:${rule.window}:${i}`}
										className="flex items-baseline justify-between gap-3 px-3 py-1.5"
									>
										<div className="min-w-0">
											<div className="text-sm font-mono tabular-nums text-foreground">
												{compactNumber(rule.amount)}{" "}
												<span className="text-muted-foreground text-[11px]">
													{rule.meter}
												</span>
											</div>
											<div className="text-[10px] text-muted-foreground">
												{windowLabel(rule.window)} ·{" "}
												<span className="font-mono">{rule.strategy}</span>
											</div>
										</div>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			)}
		</section>
	);
}

function PoliciesPanel({ rateLimit }: { rateLimit: RateLimit }) {
	const refs = useRateLimitReferences(rateLimit.metadata.id);

	if (refs.length === 0) {
		return (
			<section>
				<SectionTitle>Policies</SectionTitle>
				<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
					<ShieldCheck
						className="mx-auto w-5 h-5 text-muted-foreground/60 mb-1.5"
						aria-hidden
					/>
					<div className="text-sm font-medium text-foreground">
						Not used by any policy
					</div>
					<div className="mt-0.5 text-xs text-muted-foreground">
						Attach this rate limit to a policy from the policy's rate-limits
						tab.
					</div>
				</div>
			</section>
		);
	}

	return (
		<section>
			<SectionTitle
				aside={`${refs.length} reference${refs.length === 1 ? "" : "s"}`}
			>
				Policies
			</SectionTitle>
			<DetailTable columns={POLICY_COLUMNS} className="mt-0">
				{refs.map((ref) => {
					const name = ref.policy.metadata.name;
					const enabled = ref.policy.spec.enabled !== false;
					const hostOwned = ref.policy.metadata.owner?.kind === "host";
					const unscoped = ref.models.length === 0;
					const scopeCount = unscoped
						? (ref.policy.spec.models?.length ?? 0)
						: ref.models.length;
					return (
						<tr
							// Relay refuses one rate limit linked twice over the same models.
							key={`${name}|${ref.models.join(",")}`}
							className="hover:bg-muted/30 transition-colors"
						>
							<Td>
								<div className="min-w-0">
									<Link
										to="/policies/$name"
										params={{ name }}
										search={{ tab: "rate-limits" }}
										className="text-foreground hover:underline truncate font-medium"
									>
										{displayLabel(ref.policy.metadata)}
									</Link>
									<div className="text-[11px] text-muted-foreground font-mono truncate">
										{name}
										{hostOwned && (
											<span className="ml-1.5 text-[9px] uppercase tracking-wide">
												· host-owned
											</span>
										)}
									</div>
								</div>
							</Td>
							<Td>
								<Badge tone={unscoped ? "default" : "scoped"}>
									{unscoped ? "All models" : "Scoped"}
								</Badge>
							</Td>
							<Td className="text-right tabular-nums">
								{unscoped ? (
									<span className="text-muted-foreground">
										all ({scopeCount})
									</span>
								) : (
									<span className="text-foreground">
										{scopeCount} ref{scopeCount === 1 ? "" : "s"}
									</span>
								)}
							</Td>
							<Td className="text-right">
								{enabled ? (
									<span className="text-[11px] text-success">Enabled</span>
								) : (
									<span className="text-[11px] text-muted-foreground">
										Disabled
									</span>
								)}
							</Td>
						</tr>
					);
				})}
			</DetailTable>
		</section>
	);
}

const POLICY_COLUMNS = [
	{ label: "Policy" },
	{ label: "Link" },
	{ label: "Scope", className: "text-right" },
	{ label: "Status", className: "text-right" },
];

function RateLimitIssues({ rateLimitId }: { rateLimitId: string | undefined }) {
	const diagnostics = useRateLimitDiagnostics(rateLimitId);
	return <IssuesPanel diagnostics={diagnostics} />;
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

function Badge({
	children,
	tone = "muted",
}: {
	children: React.ReactNode;
	tone?: "muted" | "default" | "scoped";
}) {
	const styles =
		tone === "default"
			? "bg-info/10 text-info border-info/30"
			: tone === "scoped"
				? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30"
				: "bg-muted text-muted-foreground border-border";
	return (
		<span
			className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide border ${styles}`}
		>
			{children}
		</span>
	);
}
