export interface TrackRow {
	key: string;
	label: string;
	/** Bar length, relative to the largest row. */
	value: number;
	/** The value as shown at the right. */
	display: string;
	/** Series color; the neutral bar when omitted. */
	color?: string;
	/** Hover text with the row's other facts. */
	detail?: string;
}

/** Ranks a handful of rows: label left, a bar on a rail, the value right. */
export function TrackBars({ rows }: { rows: TrackRow[] }) {
	const max = Math.max(1, ...rows.map((r) => r.value));
	return (
		<ul className="grid">
			{rows.map((r) => (
				<li
					key={r.key}
					title={r.detail ? `${r.label} · ${r.detail}` : r.label}
					className="grid grid-cols-[minmax(0,9rem)_minmax(3rem,1fr)_auto] items-center gap-3 border-b border-rule py-2 last:border-b-0"
				>
					<span className="truncate text-label text-foreground">{r.label}</span>
					<span className="h-2 rounded-bar bg-track">
						<span
							className="block h-full rounded-bar"
							style={{
								width: `${r.value > 0 ? Math.max((r.value / max) * 100, 2) : 0}%`,
								backgroundColor: r.color ?? "var(--n2)",
							}}
						/>
					</span>
					<span className="text-right text-label font-medium text-foreground tabular-nums">
						{r.display}
					</span>
				</li>
			))}
		</ul>
	);
}
