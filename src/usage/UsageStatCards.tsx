import { Activity, Coins, Gauge, TriangleAlert } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { UsageKpiDeltas, UsageKpis } from "@/api/hooks/usage";
import type { DeltaResult } from "@/lib/usage-math/delta";
import { fmtCompact, fmtMs, fmtPct, fmtSignedPct, fmtSignedPp } from "./format";

/** Top-line KPI cards for the usage overview. Pass `deltas` (+ `compareLabel`)
 * to annotate each card with its period-over-period movement. `cost` is a
 * pre-built fifth card (its data comes from a slower fan-out, so callers mount
 * it behind its own Suspense to keep these four instant). */
export function UsageStatCards({
	kpis,
	deltas,
	compareLabel,
	cost,
}: {
	kpis: UsageKpis;
	deltas?: UsageKpiDeltas;
	compareLabel?: string;
	cost?: ReactNode;
}) {
	const errorTone =
		kpis.errorRate >= 0.05
			? "text-destructive"
			: kpis.errorRate > 0
				? "text-foreground"
				: "text-foreground";

	// No traffic in the previous window → no honest baseline → no chips.
	const d = deltas?.hasBaseline ? deltas : undefined;

	return (
		<div
			className={`grid grid-cols-2 gap-3 ${cost ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
		>
			<StatCard
				icon={Activity}
				label="Requests"
				value={fmtCompact(kpis.requests)}
				delta={d && deltaChip(d.requests, "pct", "neutral", compareLabel)}
			/>
			<StatCard
				icon={TriangleAlert}
				label="Error rate"
				value={fmtPct(kpis.errorRate)}
				valueClassName={errorTone}
				hint={`${fmtCompact(kpis.errors)} errors`}
				delta={d && deltaChip(d.errorRate, "pp", "down", compareLabel)}
			/>
			<StatCard
				icon={Gauge}
				label="Avg latency"
				value={fmtMs(kpis.avgMs)}
				delta={d && deltaChip(d.avgMs, "pct", "down", compareLabel)}
			/>
			<StatCard
				icon={Coins}
				label="Tokens"
				value={fmtCompact(kpis.tokens)}
				hint={`raw ${fmtCompact(kpis.rawInput)} in · ${fmtCompact(kpis.rawOutput)} out`}
				delta={d && deltaChip(d.tokens, "pct", "neutral", compareLabel)}
			/>
			{cost}
		</div>
	);
}

/**
 * Movement chip: signed change, colored only when a direction is unambiguously
 * good or bad (`goodWhen`); volume metrics stay neutral. Returns null when the
 * metric has no relative baseline (e.g. previous avg latency of 0).
 */
export function deltaChip(
	delta: DeltaResult,
	unit: "pct" | "pp",
	goodWhen: "down" | "neutral",
	compareLabel?: string,
): ReactNode {
	if (unit === "pct" && delta.ratio === null) return null;
	const text =
		unit === "pp" ? fmtSignedPp(delta.delta) : fmtSignedPct(delta.ratio ?? 0);

	let tone = "text-muted-foreground";
	if (goodWhen !== "neutral" && delta.direction !== "flat") {
		const good = delta.direction === goodWhen;
		tone = good ? "text-success" : "text-destructive";
	}

	return (
		<span className={`shrink-0 font-medium ${tone}`} title={compareLabel}>
			{text}
		</span>
	);
}

export function StatCard({
	icon: Icon,
	label,
	value,
	valueClassName = "text-foreground",
	hint,
	delta,
}: {
	icon: ComponentType<{ className?: string }>;
	label: string;
	value: string;
	valueClassName?: string;
	hint?: string;
	delta?: ReactNode;
}) {
	return (
		<div className="rounded-lg border border-border bg-card px-4 py-3">
			<div className="flex items-center justify-between">
				<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
					{label}
				</span>
				<Icon className="size-3.5 text-muted-foreground/50" aria-hidden />
			</div>
			<div
				className={`mt-2 text-[1.75rem] font-semibold leading-none tabular-nums ${valueClassName}`}
			>
				{value}
			</div>
			<div className="mt-1.5 flex h-3 items-center justify-between gap-2 text-[11px] tabular-nums text-muted-foreground">
				<span className="truncate">{hint ?? ""}</span>
				{delta}
			</div>
		</div>
	);
}
