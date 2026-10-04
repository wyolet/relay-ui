import { Link } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import type { ReactNode } from "react";
import {
	type UsageGroupBy,
	type UsageGroupStat,
	type UsageSummaryFilter,
	type UsageWindow,
	useUsageOverview,
} from "@/api/hooks/usage";
import {
	dimensionLabel,
	fmtCompact,
	fmtMoneyCompact,
	fmtMs,
	fmtPct,
} from "./format";
import { rankColor } from "./palette";
import { UsageEmpty } from "./UsageEmpty";
import { useGroupLabeler } from "./useGroupLabeler";
import { useGroupLogo } from "./useGroupLogo";

/**
 * Ranked leaderboard for one dimension, with inline volume bars. Pass `limit`
 * to show only the top N rows with a "view all" footer (dashboard compact mode).
 */
export function UsageTopGroups({
	groupBy,
	limit,
	win,
	filter,
}: {
	groupBy: UsageGroupBy;
	limit?: number;
	/** Window to rank within; omit for the server's default window. */
	win?: UsageWindow;
	/** Server-side slice to rank within (the explorer's scope filters). */
	filter?: UsageSummaryFilter;
}) {
	const { groups } = useUsageOverview(groupBy, win, filter);
	const labelFor = useGroupLabeler(groupBy);
	const logoFor = useGroupLogo(groupBy, 24);

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

	const shown = limit ? groups.slice(0, limit) : groups;
	const hidden = groups.length - shown.length;

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
			<ul className="flex flex-col gap-1 p-2">
				{shown.map((g, i) => (
					<GroupRow
						key={g.key}
						stat={g}
						label={labelFor(g.key)}
						logo={logoFor(g.key)}
						color={rankColor(i)}
					/>
				))}
			</ul>
			{hidden > 0 && (
				<Link
					to="/usage"
					search={{ group_by: groupBy }}
					className="flex items-center justify-center border-t border-border px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground"
				>
					View all {groups.length} →
				</Link>
			)}
		</div>
	);
}

function GroupRow({
	stat,
	label,
	logo,
	color,
}: {
	stat: UsageGroupStat;
	label: string;
	logo: ReactNode;
	color: string;
}) {
	const errTone =
		stat.errorCount > 0 && stat.errorRate >= 0.05
			? "text-destructive"
			: stat.errorCount > 0
				? "text-foreground"
				: "text-muted-foreground";

	return (
		<li
			className="relative overflow-hidden rounded-md px-2.5 py-2"
			style={{ backgroundImage: tintWash(color) }}
		>
			<div className="flex items-center gap-2.5">
				{/* Leading avatar, vertically centered against the text stack */}
				<span className="shrink-0">{logo ?? <Swatch color={color} />}</span>

				<div className="min-w-0 flex-1">
					<span
						className="block truncate text-sm font-medium text-foreground"
						title={stat.key}
					>
						{label}
					</span>
					<dl className="mt-0.5 flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
						<SubStat
							label="err"
							value={fmtPct(stat.errorRate)}
							tone={errTone}
						/>
						<span className="text-border">·</span>
						<SubStat label="p95" value={fmtMs(stat.duration.p95)} />
						<span className="text-border">·</span>
						<SubStat label="tok" value={fmtCompact(stat.tokens)} />
						<span className="text-border">·</span>
						<SubStat
							label="cost"
							value={
								stat.cost.usd != null
									? `≈${fmtMoneyCompact(stat.cost.usd, "USD")}`
									: "—"
							}
							tone={stat.cost.usd != null ? "text-foreground" : undefined}
						/>
					</dl>
				</div>

				{/* Volume on the right, balances the row */}
				<div className="shrink-0 pl-2 text-right tabular-nums">
					<div className="text-sm font-semibold text-foreground">
						{fmtCompact(stat.requests)}
					</div>
					<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
						req
					</div>
				</div>
			</div>

			{/* Thin share bar, pinned to the bottom edge */}
			<div
				className="absolute bottom-0 left-0 h-0.5 rounded-full"
				style={{
					width: `${Math.max(stat.share * 100, 3)}%`,
					backgroundColor: color,
				}}
				aria-hidden
			/>
		</li>
	);
}

/** A quiet per-row color wash — left tint fading to transparent. */
function tintWash(color: string): string {
	return `linear-gradient(90deg, color-mix(in oklch, ${color} 15%, transparent), color-mix(in oklch, ${color} 5%, transparent) 55%, transparent)`;
}

/** Fallback identity anchor for dimensions without a logo: a tinted dot. */
function Swatch({ color }: { color: string }) {
	return (
		<span
			className="inline-flex size-6 items-center justify-center rounded-sm bg-muted"
			aria-hidden
		>
			<span
				className="size-2.5 rounded-full"
				style={{ backgroundColor: color }}
			/>
		</span>
	);
}

function SubStat({
	label,
	value,
	tone = "text-muted-foreground",
}: {
	label: string;
	value: string;
	tone?: string;
}) {
	return (
		<div className="inline-flex items-baseline gap-1">
			<dd className={tone}>{value}</dd>
			<dt className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
				{label}
			</dt>
		</div>
	);
}
