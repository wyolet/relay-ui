import { BarChart3 } from "lucide-react";
import {
	type UsageGroupBy,
	type UsageGroupStat,
	useUsageOverview,
} from "@/api/hooks/usage";
import { dimensionLabel, fmtCompact, fmtMs, fmtPct } from "./format";
import { UsageEmpty } from "./UsageEmpty";
import { useGroupLabeler } from "./useGroupLabeler";

/** Ranked leaderboard for one dimension, with inline volume bars. */
export function UsageTopGroups({ groupBy }: { groupBy: UsageGroupBy }) {
	const { groups } = useUsageOverview(groupBy);
	const labelFor = useGroupLabeler(groupBy);

	if (groups.length === 0) {
		return (
			<UsageEmpty
				icon={BarChart3}
				title="No usage yet"
				body={`Once traffic flows through the relay, the busiest ${dimensionLabel(
					groupBy,
				).toLowerCase()} values rank here — volume, error rate, p95 latency, and tokens.`}
			/>
		);
	}

	return (
		<div className="rounded-lg border border-border bg-card">
			<div className="flex items-center justify-between border-b border-border px-4 py-2.5">
				<h2 className="text-sm font-medium text-foreground">
					Top by {dimensionLabel(groupBy).toLowerCase()}
				</h2>
				<span className="text-[11px] text-muted-foreground">
					{groups.length} group{groups.length === 1 ? "" : "s"}
				</span>
			</div>
			<ul className="divide-y divide-border">
				{groups.map((g) => (
					<GroupRow key={g.key} stat={g} label={labelFor(g.key)} />
				))}
			</ul>
		</div>
	);
}

function GroupRow({ stat, label }: { stat: UsageGroupStat; label: string }) {
	const hasErrors = stat.errorCount > 0;
	return (
		<li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5">
			<div className="min-w-0">
				<code
					className="block truncate font-mono text-xs text-foreground"
					title={stat.key}
				>
					{label}
				</code>
				<div
					className="mt-1.5 h-1.5 rounded-full bg-primary/80"
					style={{ width: `${Math.max(stat.share * 100, 2)}%` }}
					aria-hidden
				/>
			</div>
			<dl className="flex items-center gap-4 text-right tabular-nums">
				<Stat label="req" value={fmtCompact(stat.requests)} />
				<Stat
					label="err"
					value={fmtPct(stat.errorRate)}
					tone={
						hasErrors && stat.errorRate >= 0.05
							? "text-destructive"
							: hasErrors
								? "text-foreground"
								: "text-muted-foreground"
					}
				/>
				<Stat label="p95" value={fmtMs(stat.duration.p95)} />
				<Stat label="tok" value={fmtCompact(stat.tokens)} />
			</dl>
		</li>
	);
}

function Stat({
	label,
	value,
	tone = "text-foreground",
}: {
	label: string;
	value: string;
	tone?: string;
}) {
	return (
		<div className="w-16">
			<dd className={`text-sm ${tone}`}>{value}</dd>
			<dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
		</div>
	);
}
