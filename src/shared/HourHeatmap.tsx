import { useState } from "react";
import { cn } from "@/lib/utils";

export interface HeatCell {
	key: string;
	/** 0 for empty, 1..5 up the heat ramp. */
	level: number;
	/** The count, shown first in the tooltip ("1,234 requests"). */
	value: string;
	/** When the cell covers ("Fri 16 · 14:00"). */
	when: string;
	/** The block holding the current time: drawn with a ring. */
	current?: boolean;
	/** Outside the period shown (not yet reached, or before it began): blank. */
	outside?: boolean;
}

export interface HeatRow {
	key: string;
	day: string;
	cells: HeatCell[];
	total: string;
}

const LEVEL_BG = [
	"bg-q0",
	"bg-q1",
	"bg-q2",
	"bg-q3",
	"bg-q4",
	"bg-q5",
] as const;

/** A day-by-hour-block grid on the heat ramp, each day's total at the right. */
export function HourHeatmap({
	rows,
	hours,
}: {
	rows: HeatRow[];
	hours: string[];
}) {
	const columns = {
		gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))`,
	};
	// One tooltip for the grid, pinned above the hovered cell.
	const [tip, setTip] = useState<{ cell: HeatCell; x: number; y: number }>();
	return (
		<>
			<div className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] gap-x-3 gap-y-1">
				<span />
				<div className="grid gap-1" style={columns}>
					{hours.map((h, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed hour axis
						<span key={i} className="text-foot text-ink-3 tabular-nums">
							{h}
						</span>
					))}
				</div>
				<span />
				{rows.map((r) => (
					<div key={r.key} className="contents">
						<span className="self-center text-meta text-ink-2">{r.day}</span>
						<div className="grid gap-1" style={columns}>
							{r.cells.map((c) =>
								c.outside ? (
									<span key={c.key} className="h-5" aria-hidden />
								) : (
									<span
										key={c.key}
										role="img"
										aria-label={`${c.when}: ${c.value}`}
										onPointerEnter={(e) => {
											const r = e.currentTarget.getBoundingClientRect();
											setTip({ cell: c, x: r.left + r.width / 2, y: r.top });
										}}
										onPointerLeave={() => setTip(undefined)}
										className={cn(
											"h-5 rounded-cell",
											LEVEL_BG[c.level] ?? LEVEL_BG[0],
											c.current && "ring-[1.5px] ring-foreground ring-inset",
										)}
									/>
								),
							)}
						</div>
						<span className="self-center text-right text-meta font-medium text-foreground tabular-nums">
							{r.total}
						</span>
					</div>
				))}
			</div>
			{tip && (
				<div
					role="tooltip"
					className="pointer-events-none fixed z-50 grid -translate-x-1/2 -translate-y-full gap-0.5 whitespace-nowrap rounded-tip border border-tip-rule bg-tip-bg px-[11px] py-2 text-meta text-tip-ink shadow-tip"
					style={{ left: tip.x, top: tip.y - 6 }}
				>
					<span className="font-semibold tabular-nums">{tip.cell.value}</span>
					<span className="text-tip-ink/70">
						{tip.cell.when}
						{tip.cell.current && " · now"}
					</span>
				</div>
			)}
		</>
	);
}

/** The ramp's steps, for a section heading. */
export function HeatLegend() {
	return (
		<span className="inline-flex items-center gap-1.5 text-meta text-ink-2">
			Fewer
			{LEVEL_BG.map((bg) => (
				<span key={bg} className={`size-[9px] rounded-[2px] ${bg}`} />
			))}
			More
		</span>
	);
}
