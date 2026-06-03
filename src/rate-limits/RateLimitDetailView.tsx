import { Link } from "@tanstack/react-router";
import { Gauge, Pencil, Power, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useRelayKeys } from "@/api/hooks/relayKeys";
import type { RateLimit, RateLimitRule } from "@/api/types/ratelimit";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useRateLimitDiagnostics } from "@/diagnostics/useDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { compactNumber } from "@/lib/rateLimitFormat";
import { isProviderOwned, isSystemOwned } from "@/lib/systemRateLimits";
import { windowLabel } from "@/lib/timeWindow";
import { useRateLimitReferences } from "@/rate-limits/useRateLimitReferences";

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
			<IssuesPanel rateLimitId={rateLimit.metadata.id} />
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
			<div className="flex items-center gap-2 shrink-0">
				{canMutate && (
					<>
						<button
							type="button"
							onClick={onToggleEnabled}
							disabled={toggling}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-foreground border border-border hover:bg-muted disabled:opacity-50 transition-colors"
						>
							<Power className="w-3.5 h-3.5" />
							{enabled ? "Disable" : "Enable"}
						</button>
						<Link
							to="/policies/rate-limits/$name/edit"
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

function RulesPanel({ rules }: { rules: readonly RateLimitRule[] }) {
	const groups = useMemo(() => groupRules(rules), [rules]);
	return (
		<section>
			<SectionTitle>Rules</SectionTitle>
			{rules.length === 0 ? (
				<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
					<div className="text-sm font-medium text-foreground">
						No rules configured
					</div>
					<div className="mt-0.5 text-xs text-muted-foreground">
						This rate limit will never throttle. Add a rule to enforce a quota.
					</div>
				</div>
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
	const { data: relayKeys } = useRelayKeys();

	const relayKeyCountByPolicy = useMemo(() => {
		const counts = new Map<string, number>();
		for (const rk of relayKeys.items ?? []) {
			const pid = rk.spec.policyId;
			if (!pid) continue;
			counts.set(pid, (counts.get(pid) ?? 0) + 1);
		}
		return counts;
	}, [relayKeys]);

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
			<div className="mb-2 flex items-baseline justify-between gap-2">
				<SectionTitle>Policies</SectionTitle>
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{refs.length} reference{refs.length === 1 ? "" : "s"}
				</span>
			</div>
			<div className="rounded-md border border-border bg-card overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
						<tr>
							<Th>Policy</Th>
							<Th>Binding</Th>
							<Th className="text-right">Scope</Th>
							<Th className="text-right">Relay keys</Th>
							<Th className="text-right">Status</Th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{refs.map((ref) => {
							const name = ref.policy.metadata.name;
							const id = ref.policy.metadata.id;
							const enabled = ref.policy.spec.enabled !== false;
							const hostOwned = ref.policy.metadata.owner?.kind === "host";
							const rkCount = id ? (relayKeyCountByPolicy.get(id) ?? 0) : 0;
							const scopeCount = ref.isDefault
								? (ref.policy.spec.models?.length ?? 0)
								: ref.refs.length;
							const inactive = !ref.isDefault && ref.refs.length === 0;
							return (
								<tr
									key={`${name}:${ref.isDefault ? "default" : `b${ref.bindingIndex}`}`}
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
										<Badge tone={ref.isDefault ? "default" : "scoped"}>
											{ref.isDefault ? "Default" : "Scoped"}
										</Badge>
									</Td>
									<Td className="text-right tabular-nums">
										{ref.isDefault ? (
											<span className="text-muted-foreground">
												all ({scopeCount})
											</span>
										) : inactive ? (
											<span className="text-amber-600 dark:text-amber-400 text-[11px]">
												inactive
											</span>
										) : (
											<span className="text-foreground">
												{scopeCount} ref{scopeCount === 1 ? "" : "s"}
											</span>
										)}
									</Td>
									<Td className="text-right tabular-nums">
										<span
											className={
												rkCount === 0
													? "text-muted-foreground"
													: "text-foreground"
											}
										>
											{rkCount}
										</span>
									</Td>
									<Td className="text-right">
										{enabled ? (
											<span className="text-[11px] text-emerald-700 dark:text-emerald-400">
												Enabled
											</span>
										) : (
											<span className="text-[11px] text-muted-foreground">
												Disabled
											</span>
										)}
									</Td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
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

function IssuesPanel({ rateLimitId }: { rateLimitId: string | undefined }) {
	const diagnostics = useRateLimitDiagnostics(rateLimitId);
	if (diagnostics.length === 0) return null;
	return (
		<section>
			<SectionTitle>Issues</SectionTitle>
			<DiagnosticList diagnostics={diagnostics} />
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

function OwnerBadge({ label }: { label: string }) {
	return (
		<span
			className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border"
			title={`${label}-owned and managed by Relay.`}
		>
			{label}-owned
		</span>
	);
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
			? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
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

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
			{children}
		</h2>
	);
}
