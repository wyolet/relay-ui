import type { UsageKpis } from "@/api/hooks/usage";
import { fmtCompact, fmtMs, fmtPct } from "./format";

/** Top-line KPI cards for the usage overview. */
export function UsageStatCards({ kpis }: { kpis: UsageKpis }) {
	const errorTone =
		kpis.errorRate >= 0.05
			? "text-destructive"
			: kpis.errorRate > 0
				? "text-foreground"
				: "text-muted-foreground";

	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<Card label="Requests" value={fmtCompact(kpis.requests)} />
			<Card
				label="Error rate"
				value={fmtPct(kpis.errorRate)}
				valueClassName={errorTone}
				hint={`${fmtCompact(kpis.errors)} errors`}
			/>
			<Card label="Avg latency" value={fmtMs(kpis.avgMs)} />
			<Card label="Tokens" value={fmtCompact(kpis.tokens)} />
		</div>
	);
}

function Card({
	label,
	value,
	valueClassName = "text-foreground",
	hint,
}: {
	label: string;
	value: string;
	valueClassName?: string;
	hint?: string;
}) {
	return (
		<div className="rounded-lg border border-border bg-card px-4 py-3">
			<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
				{label}
			</div>
			<div
				className={`mt-1 text-2xl font-semibold tabular-nums ${valueClassName}`}
			>
				{value}
			</div>
			{hint && (
				<div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
					{hint}
				</div>
			)}
		</div>
	);
}
