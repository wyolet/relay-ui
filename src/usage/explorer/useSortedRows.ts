import { useState } from "react";
import type { ExplorerRow } from "./ExplorerTable";

/** Click-to-sort state for the explorer table: a column key and direction,
 * largest first by default. `null` keeps the hook's own ranking. */
export function useSortedRows(rows: ExplorerRow[]) {
	const [sort, setSort] = useState<{ key: string; desc: boolean } | null>(null);
	const sorted = sort
		? [...rows].sort((a, b) => {
				const diff = (a.sort[sort.key] ?? 0) - (b.sort[sort.key] ?? 0);
				return sort.desc ? -diff : diff;
			})
		: rows;
	const toggle = (key: string) =>
		setSort((s) =>
			s?.key === key
				? s.desc
					? { key, desc: false }
					: null
				: { key, desc: true },
		);
	return { rows: sorted, sort, toggle };
}
