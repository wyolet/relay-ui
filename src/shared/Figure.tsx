/** A headline number: the figure, what it counts, and one quiet note. Every
 * line stays on one line; the full note is on hover when it truncates. */
export function Figure({
	value,
	label,
	note,
}: {
	value: string;
	label: string;
	note?: string;
}) {
	return (
		<div className="grid min-w-0 content-start gap-1.5">
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
