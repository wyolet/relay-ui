import { ShareBar } from "./ShareBar";

export interface RankRow {
	key: string;
	label: string;
	/** Bar length against the top row, 0..1. */
	share: number;
	value: string;
}

/** A short ranked list: label, bar, value, one hairline per row. */
export function RankList({ rows, empty }: { rows: RankRow[]; empty: string }) {
	if (rows.length === 0) {
		return <p className="text-label text-ink-2">{empty}</p>;
	}
	return (
		<ul className="grid">
			{rows.map((r, i) => (
				<li
					key={r.key}
					className="grid grid-cols-[minmax(0,10rem)_minmax(3rem,1fr)_auto] items-center gap-3 border-b border-rule py-2 last:border-b-0"
				>
					<span className="truncate text-label text-foreground" title={r.label}>
						{r.label}
					</span>
					<ShareBar share={r.share} lead={i === 0} />
					<span className="text-right text-label font-medium text-foreground tabular-nums">
						{r.value}
					</span>
				</li>
			))}
		</ul>
	);
}
