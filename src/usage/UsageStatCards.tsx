import { Activity, Coins, Gauge, TriangleAlert } from "lucide-react";
import type { ComponentType } from "react";
import type { UsageKpis } from "@/api/hooks/usage";
import { fmtCompact, fmtMs, fmtPct } from "./format";

/** Top-line KPI cards for the usage overview. */
export function UsageStatCards({ kpis }: { kpis: UsageKpis }) {
	const errorTone =
		kpis.errorRate >= 0.05
			? "text-destructive"
			: kpis.errorRate > 0
				? "text-foreground"
				: "text-foreground";

	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<Card icon={Activity} label="Requests" value={fmtCompact(kpis.requests)} />
			<Card
				icon={TriangleAlert}
				label="Error rate"
				value={fmtPct(kpis.errorRate)}
				valueClassName={errorTone}
				hint={`${fmtCompact(kpis.errors)} errors`}
			/>
			<Card icon={Gauge} label="Avg latency" value={fmtMs(kpis.avgMs)} />
			<Card icon={Coins} label="Tokens" value={fmtCompact(kpis.tokens)} />
		</div>
	);
}

function Card({
	icon: Icon,
	label,
	value,
	valueClassName = "text-foreground",
	hint,
}: {
	icon: ComponentType<{ className?: string }>;
	label: string;
	value: string;
	valueClassName?: string;
	hint?: string;
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
			<div className="mt-1.5 h-3 text-[11px] tabular-nums text-muted-foreground">
				{hint ?? ""}
			</div>
		</div>
	);
}
