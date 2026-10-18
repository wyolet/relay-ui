/** A headline number: the figure, what it counts, one quiet note, and an
 * optional trend of small columns with the latest in the data accent. Every
 * line stays on one line; the full note is on hover when it truncates. */
export function Figure({
	value,
	label,
	note,
	trend,
}: {
	value: string;
	label: string;
	note?: string;
	/** Oldest first; null marks a period not reached yet. */
	trend?: (number | null)[];
}) {
	return (
		// Bottom-aligned, so figures with and without a trend line up in a row.
		<div className="grid min-w-0 content-end gap-1.5">
			{trend && <Trend values={trend} />}
			<span className="truncate font-display text-mini-figure text-foreground tabular-nums lg:text-figure">
				{value}
			</span>
			<span className="truncate text-label text-ink-2">{label}</span>
			{note && (
				<span className="truncate text-meta text-ink-3" title={note}>
					{note}
				</span>
			)}
		</div>
	);
}

function Trend({ values }: { values: (number | null)[] }) {
	const max = Math.max(1, ...values.map((v) => v ?? 0));
	const latest = values.reduce<number>(
		(last, v, i) => (v === null ? last : i),
		-1,
	);
	return (
		<div className="mb-2 flex h-7 items-end gap-1" aria-hidden>
			{values.map((v, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed period slots
					key={i}
					className="w-2.5 rounded-t-[2px]"
					style={{
						height: v === null ? 2 : `${Math.max((v / max) * 100, 7)}%`,
						backgroundColor:
							v === null
								? "var(--track)"
								: i === latest
									? "var(--chart-1)"
									: "var(--chart-2)",
						opacity: v === null || i === latest ? 1 : 0.55,
					}}
				/>
			))}
		</div>
	);
}
