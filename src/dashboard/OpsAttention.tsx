import { Link } from "@tanstack/react-router";
import { CircleCheck, ShieldAlert } from "lucide-react";
import { type ReactNode, Suspense } from "react";
import { cn } from "@/lib/utils";
import { fmtCompact, fmtPct } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import { useGroupLogo } from "@/usage/useGroupLogo";
import { useDashboardHealth } from "./useDashboardHealth";
import {
	AUTH_STATUSES,
	THROTTLED_STATUSES,
	useBreakerHealth,
	useDegradedHosts,
	useRejections,
} from "./useOpsAttention";

/**
 * The dashboard's lead block: what needs an operator's attention over the
 * trailing 24h — rejected (4xx) traffic split by kind and relay key, host
 * keys with a tripped circuit breaker, and hosts with elevated error rates.
 * Quiet when everything is fine; control-plane health only surfaces when
 * degraded.
 */
export function OpsAttention() {
	return (
		<section className="overflow-hidden rounded-lg border border-border bg-card">
			<OpsHeader />
			<div className="grid grid-cols-1 divide-y divide-border border-t border-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
				<Suspense fallback={<PanelShell title="Client errors" pending />}>
					<RejectionsPanel />
				</Suspense>
				<BreakerPanel />
				<Suspense fallback={<PanelShell title="Degraded hosts" pending />}>
					<DegradedHostsPanel />
				</Suspense>
			</div>
		</section>
	);
}

/** Title row plus the useful remnants of the old health strip. Quiet when
 * fine: subsystem pills and the master-key warning only appear degraded —
 * a healthy system shows just the title and the relay version. */
function OpsHeader() {
	const { subsystems, masterKeyConfigured, version } = useDashboardHealth();
	const unhealthy = subsystems.filter((s) => s.status !== "ok");

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
			<div className="flex items-baseline gap-2">
				<h2 className="text-sm font-medium text-foreground">Operations</h2>
				<span className="text-[11px] text-muted-foreground">last 24h</span>
			</div>
			<div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
				{unhealthy.map((s) => (
					<span
						key={s.key}
						title={s.error}
						className={cn(
							"inline-flex items-center gap-1.5 font-medium",
							s.status === "error"
								? "text-destructive"
								: "text-amber-600 dark:text-amber-400",
						)}
					>
						<span
							className={cn(
								"size-2 rounded-full",
								s.status === "error" ? "bg-destructive" : "bg-amber-500",
							)}
							aria-hidden="true"
						/>
						{s.label} {s.status === "error" ? "down" : "degraded"}
					</span>
				))}
				{masterKeyConfigured === false && (
					<span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
						<ShieldAlert className="size-3.5" aria-hidden="true" />
						No master key
					</span>
				)}
				{version && (
					<span
						className="font-mono tabular-nums text-muted-foreground/70"
						title="Relay version"
					>
						v{version.replace(/^v/, "")}
					</span>
				)}
			</div>
		</div>
	);
}

function RejectionsPanel() {
	const { buckets, topKeys } = useRejections();
	const labelFor = useGroupLabeler("relay_key_hash");

	return (
		<PanelShell
			title="Client errors"
			count={buckets.total}
			tone="warn"
			footer={
				buckets.total > 0 && (
					<Link
						to="/logs"
						search={{ status_class: "4xx", since: "24h" }}
						className="flex items-center justify-end px-4 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
					>
						Inspect 4xx in logs →
					</Link>
				)
			}
		>
			{buckets.total === 0 ? (
				<AllClear>No rejected requests in the last 24h.</AllClear>
			) : (
				<>
					<div className="flex flex-wrap items-center gap-1.5 px-4 pb-1.5">
						<RejectionChip
							label="Throttled"
							hint="429"
							count={buckets.throttled}
							statuses={THROTTLED_STATUSES}
						/>
						<RejectionChip
							label="Auth"
							hint="401·403"
							count={buckets.auth}
							statuses={AUTH_STATUSES}
						/>
						{buckets.other > 0 && (
							<span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
								Other
								<span className="font-semibold tabular-nums text-foreground">
									{fmtCompact(buckets.other)}
								</span>
							</span>
						)}
					</div>
					<ul className="divide-y divide-border/60 border-t border-border/60">
						{topKeys.map((g) => (
							<li
								key={g.key}
								className="flex items-center justify-between gap-3 px-4 py-2"
							>
								<code
									className="min-w-0 truncate font-mono text-xs text-foreground"
									title={g.key}
								>
									{labelFor(g.key)}
								</code>
								<span className="shrink-0 text-sm font-medium tabular-nums text-amber-600 dark:text-amber-400">
									{fmtCompact(g.count)}
								</span>
							</li>
						))}
					</ul>
				</>
			)}
		</PanelShell>
	);
}

/** One rejection-kind count, linking to exactly those statuses in logs.
 * Buckets at zero render nothing — the eye should land only on what fired. */
function RejectionChip({
	label,
	hint,
	count,
	statuses,
}: {
	label: string;
	hint: string;
	count: number;
	statuses: number[];
}) {
	if (count === 0) return null;
	return (
		<Link
			to="/logs"
			search={{ status: statuses, since: "24h" }}
			title={hint}
			className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
		>
			{label}
			<span className="font-semibold tabular-nums">{fmtCompact(count)}</span>
		</Link>
	);
}

function BreakerPanel() {
	const { pending, keysChecked, attention } = useBreakerHealth();

	return (
		<PanelShell title="Key health" count={attention.length} pending={pending}>
			{attention.length === 0 ? (
				pending ? null : (
					<AllClear>
						{keysChecked === 0
							? "No host keys configured."
							: `All ${keysChecked} key${keysChecked === 1 ? "" : "s"} healthy.`}
					</AllClear>
				)
			) : (
				<ul className="divide-y divide-border/60">
					{attention.map((k) => (
						<li key={k.id}>
							<Link
								to="/host-keys/$name"
								params={{ name: k.name }}
								className="flex flex-col gap-0.5 px-4 py-2 hover:bg-muted/50"
							>
								<span className="flex items-center justify-between gap-3">
									<span className="min-w-0 truncate text-sm font-medium text-foreground">
										{k.label}
									</span>
									<span
										className={cn(
											"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
											k.state === "open"
												? "bg-destructive/15 text-destructive"
												: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
										)}
									>
										{k.state === "open" ? "Open" : "Half-open"}
									</span>
								</span>
								<span className="truncate text-[11px] text-muted-foreground">
									{breakerDetail(
										k.reason,
										k.indefinite,
										k.cooldownRemainingSeconds,
									)}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</PanelShell>
	);
}

function DegradedHostsPanel() {
	const hosts = useDegradedHosts();
	const labelFor = useGroupLabeler("host_id");
	const logoFor = useGroupLogo("host_id", 18);

	return (
		<PanelShell title="Degraded hosts" count={hosts.length}>
			{hosts.length === 0 ? (
				<AllClear>No degraded hosts in the last 24h.</AllClear>
			) : (
				<ul className="divide-y divide-border/60">
					{hosts.map((h) => (
						<li key={h.key}>
							<Link
								to="/logs"
								search={{ host_id: [h.key], errors: true, since: "24h" }}
								className="flex items-center gap-2.5 px-4 py-2 hover:bg-muted/50"
							>
								<span className="shrink-0">{logoFor(h.key)}</span>
								<span
									className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
									title={h.key}
								>
									{labelFor(h.key)}
								</span>
								<span className="flex shrink-0 items-center gap-2 text-right tabular-nums">
									<span className="text-sm font-medium text-destructive">
										{fmtPct(h.errorRate)}
									</span>
									<span className="text-[11px] text-muted-foreground">
										{fmtCompact(h.errorCount)}/{fmtCompact(h.requests)}
									</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</PanelShell>
	);
}

// --- Panel chrome ---

function PanelShell({
	title,
	count,
	tone = "alert",
	pending,
	footer,
	children,
}: {
	title: string;
	count?: number;
	/** Badge color when count > 0 — match the panel's severity (4xx
	 * rejections are warnings; tripped breakers and degraded hosts are
	 * incidents). */
	tone?: "warn" | "alert";
	pending?: boolean;
	footer?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<div className="flex min-h-24 flex-col">
			<div className="flex items-center justify-between px-4 pt-2.5 pb-1.5">
				<h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
					{title}
				</h3>
				{pending ? (
					<span className="text-[11px] text-muted-foreground">checking…</span>
				) : count !== undefined && count > 0 ? (
					// Zero needs no badge — the all-clear line below already says it.
					<span
						className={cn(
							"rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
							tone === "warn"
								? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
								: "bg-destructive/10 text-destructive",
						)}
					>
						{fmtCompact(count)}
					</span>
				) : null}
			</div>
			<div className="flex-1">{children}</div>
			{footer}
		</div>
	);
}

function AllClear({ children }: { children: ReactNode }) {
	return (
		<div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
			<CircleCheck
				className="size-4 text-emerald-600 dark:text-emerald-400"
				aria-hidden="true"
			/>
			{children}
		</div>
	);
}

/** One human line for a tripped breaker: why, and when it might recover. */
function breakerDetail(
	reason: string | undefined,
	indefinite: boolean | undefined,
	cooldownSeconds: number | undefined,
): string {
	const recovery = indefinite
		? "open until the key heals or is rotated"
		: cooldownSeconds !== undefined
			? `retries in ~${fmtEta(cooldownSeconds)}`
			: "retrying";
	return reason ? `${reason} — ${recovery}` : recovery;
}

function fmtEta(seconds: number): string {
	if (seconds < 60) return `${Math.max(Math.round(seconds), 1)}s`;
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
