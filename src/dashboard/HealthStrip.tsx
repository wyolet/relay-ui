import { KeyRound, ShieldAlert } from "lucide-react";
import type { HealthStatusLevel } from "@/api/dashboard-types";
import { cn } from "@/lib/utils";
import type { CatalogCount } from "./useCatalogCounts";
import { type HealthPill, useDashboardHealth } from "./useDashboardHealth";

const DOT: Record<HealthStatusLevel, string> = {
	ok: "bg-emerald-500 dark:bg-emerald-400",
	degraded: "bg-amber-500 dark:bg-amber-400",
	error: "bg-destructive",
};

const TEXT: Record<HealthStatusLevel, string> = {
	ok: "text-emerald-600 dark:text-emerald-400",
	degraded: "text-amber-600 dark:text-amber-400",
	error: "text-destructive",
};

const STATUS_LABEL: Record<HealthStatusLevel, string> = {
	ok: "OK",
	degraded: "Degraded",
	error: "Error",
};

const OVERALL_LABEL: Record<HealthStatusLevel, string> = {
	ok: "All systems operational",
	degraded: "Degraded performance",
	error: "Service disruption",
};

export function HealthStrip({ counts }: { counts: CatalogCount[] }) {
	const { subsystems, overall, phase, masterKeyConfigured, version } =
		useDashboardHealth();

	return (
		<section className="overflow-hidden rounded-lg border border-border bg-card">
			<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
				<div className="flex items-center gap-2.5">
					<span
						className={cn(
							"size-2.5 rounded-full",
							phase === "ready" && overall
								? DOT[overall]
								: "bg-muted-foreground/40",
						)}
						aria-hidden="true"
					/>
					<span
						className={cn(
							"text-sm font-medium",
							phase === "ready" && overall
								? TEXT[overall]
								: "text-muted-foreground",
						)}
					>
						{phase === "loading"
							? "Checking health…"
							: phase === "unavailable"
								? "Health check unavailable"
								: overall
									? OVERALL_LABEL[overall]
									: "Health unknown"}
					</span>
				</div>

				<div className="flex items-center gap-3 text-[11px] text-muted-foreground">
					{masterKeyConfigured === false ? (
						<span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
							<ShieldAlert className="size-3.5" aria-hidden="true" />
							No master key
						</span>
					) : masterKeyConfigured ? (
						<span className="inline-flex items-center gap-1">
							<KeyRound className="size-3.5" aria-hidden="true" />
							Master key set
						</span>
					) : null}
					{version && <span className="font-mono tabular-nums">{version}</span>}
				</div>
			</div>

			{phase === "unavailable" ? (
				<p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
					<code className="font-mono">/healthz</code> isn't reachable from here
					— it's served by the relay binary, not the control API this UI is
					pointed at. Subsystem status appears in an embedded deployment.
				</p>
			) : (
				<div className="grid grid-cols-2 divide-x divide-y divide-border border-t border-border sm:grid-cols-4 sm:divide-y-0">
					{phase === "loading"
						? SKELETON_KEYS.map((k) => (
								<div key={k} className="px-4 py-2.5">
									<div className="h-2 w-16 rounded bg-muted" />
									<div className="mt-2 h-3 w-10 rounded bg-muted" />
								</div>
							))
						: subsystems.map((s) => <SubsystemCell key={s.key} pill={s} />)}
				</div>
			)}

			<dl className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-border px-4 py-2.5 text-[11px]">
				{counts.map((c) => (
					<div key={c.label} className="inline-flex items-baseline gap-1.5">
						<dd className="font-medium tabular-nums text-foreground">
							{c.count ?? "—"}
						</dd>
						<dt className="text-muted-foreground">{c.label}</dt>
					</div>
				))}
			</dl>
		</section>
	);
}

const SKELETON_KEYS = ["a", "b", "c", "d"];

function SubsystemCell({ pill }: { pill: HealthPill }) {
	return (
		<div className="px-4 py-2.5" title={pill.error}>
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{pill.label}
			</div>
			<div className="mt-1 flex items-center gap-1.5">
				<span
					className={cn("size-2 rounded-full", DOT[pill.status])}
					aria-hidden="true"
				/>
				<span className={cn("text-xs font-medium", TEXT[pill.status])}>
					{STATUS_LABEL[pill.status]}
				</span>
			</div>
		</div>
	);
}
