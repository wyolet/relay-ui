import { Gauge } from "lucide-react";
import { type UsageWindow, useLatencyProfile } from "@/api/hooks/usage";
import type { LatencyRungLabel } from "@/lib/usage-math/latency";
import { fmtCompact, fmtMs } from "./format";
import { UsageEmpty } from "./UsageEmpty";

/** One bar per percentile, deepening tone toward the tail. */
const RUNG_TONES: Record<LatencyRungLabel, string> = {
	p50: "bg-primary/30",
	p95: "bg-primary/55",
	p99: "bg-primary/80",
	max: "bg-primary",
};

const RUNG_HINTS: Record<LatencyRungLabel, string> = {
	p50: "half of requests finish faster",
	p95: "19 in 20 finish faster",
	p99: "99 in 100 finish faster",
	max: "slowest request in the window",
};

/**
 * Whole-relay latency distribution for the selected window: p50/p95/p99/max
 * as a percentile ladder. Shows the tail pain the "Avg latency" KPI hides.
 */
export function LatencyProfileCard({ win }: { win: UsageWindow }) {
	const profile = useLatencyProfile(win);

	if (!profile) {
		return (
			<UsageEmpty
				icon={Gauge}
				title="No latency data"
				body="The whole-relay percentile ladder (p50 / p95 / p99 / max) appears here once the selected window sees traffic."
			/>
		);
	}

	return (
		<div className="flex flex-col rounded-lg border border-border bg-card">
			<div className="flex items-center justify-between border-b border-border px-4 py-2.5">
				<h2 className="text-sm font-medium text-foreground">Latency profile</h2>
				<span className="text-[11px] text-muted-foreground">
					all traffic · selected range
				</span>
			</div>

			<div className="flex flex-1 flex-col justify-center gap-3 p-4">
				{profile.ladder.map((rung) => (
					<div
						key={rung.label}
						className="flex items-center gap-3"
						title={RUNG_HINTS[rung.label]}
					>
						<span className="w-8 shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
							{rung.label}
						</span>
						<div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
							<div
								className={`h-full rounded-full ${RUNG_TONES[rung.label]}`}
								// sqrt keeps the median visible next to the max outlier
								style={{
									width: `${Math.max(Math.sqrt(rung.share) * 100, 2)}%`,
								}}
							/>
						</div>
						<span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
							{fmtMs(rung.ms)}
						</span>
					</div>
				))}
			</div>

			<div className="border-t border-border px-4 py-2 text-[11px] tabular-nums text-muted-foreground">
				avg {fmtMs(profile.avgMs)} · {fmtCompact(profile.requests)} requests
			</div>
		</div>
	);
}
