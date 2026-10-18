export interface HeatCell {
	key: string;
	/** 0 for empty, 1..5 up the heat ramp. */
	level: number;
	title: string;
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
	return (
		<div className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] gap-x-3 gap-y-1">
			<span />
			<div className="grid gap-1" style={columns}>
				{hours.map((h, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed hour axis
					<span key={i} className="text-[11.5px] text-ink-3 tabular-nums">
						{h}
					</span>
				))}
			</div>
			<span />
			{rows.map((r) => (
				<div key={r.key} className="contents">
					<span className="self-center text-meta text-ink-2">{r.day}</span>
					<div className="grid gap-1" style={columns}>
						{r.cells.map((c) => (
							<span
								key={c.key}
								title={c.title}
								className={`h-5 rounded-cell ${LEVEL_BG[c.level] ?? LEVEL_BG[0]}`}
							/>
						))}
					</div>
					<span className="self-center text-right text-meta font-medium text-foreground tabular-nums">
						{r.total}
					</span>
				</div>
			))}
		</div>
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
