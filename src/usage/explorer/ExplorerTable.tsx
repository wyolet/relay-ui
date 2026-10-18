import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
import { ShareBar } from "@/shared/ShareBar";
import { useSortedRows } from "./useSortedRows";

export interface ExplorerColumn {
	key: string;
	label: string;
}

export interface ExplorerRow {
	key: string;
	label: string;
	/** Bar length against the top row, 0..1. */
	share: number;
	lead: boolean;
	/** Display text per column key. */
	cells: Record<string, string>;
	/** Sort value per column key. */
	sort: Record<string, number>;
	/** False for rows that can't narrow the view (unassigned traffic). */
	drillable: boolean;
}

/**
 * The lens table: a name with its share bar, then sortable numeric columns.
 * Clicking a row narrows the explorer to it.
 */
export function ExplorerTable({
	columns,
	rows,
	onDrill,
	rowAction,
}: {
	columns: ExplorerColumn[];
	rows: ExplorerRow[];
	onDrill?: (key: string) => void;
	/** A trailing per-row affordance, e.g. a link to the row's requests. */
	rowAction?: (key: string) => ReactNode;
}) {
	const sorted = useSortedRows(rows);
	const grid = {
		gridTemplateColumns: `minmax(10rem, 16rem) minmax(5rem, 1fr) repeat(${columns.length}, minmax(5.5rem, auto))${rowAction ? " 2.25rem" : ""}`,
	};

	if (rows.length === 0) {
		return <p className="text-label text-ink-2">No traffic matches.</p>;
	}

	return (
		<div className="overflow-x-auto">
			<div className="grid min-w-[44rem]" style={grid}>
				<div className="contents text-meta text-ink-3">
					<span className="border-b border-rule pr-3 pb-2">Name</span>
					<span className="border-b border-rule px-3 pb-2">Share</span>
					{columns.map((c) => (
						<button
							key={c.key}
							type="button"
							onClick={() => sorted.toggle(c.key)}
							className="inline-flex items-center justify-end gap-1 border-b border-rule pb-2 pl-3 hover:text-foreground"
						>
							{c.label}
							{sorted.sort?.key === c.key &&
								(sorted.sort.desc ? (
									<ArrowDown className="size-3" aria-hidden />
								) : (
									<ArrowUp className="size-3" aria-hidden />
								))}
						</button>
					))}
					{rowAction && <span className="border-b border-rule pb-2" />}
				</div>
				{sorted.rows.map((r) => (
					<div key={r.key} className="group contents text-label tabular-nums">
						<span className="truncate border-b border-rule py-2.5 pr-3">
							{onDrill && r.drillable ? (
								<button
									type="button"
									title={`Narrow to ${r.label}`}
									onClick={() => onDrill(r.key)}
									className="max-w-full truncate text-left text-foreground hover:underline"
								>
									{r.label}
								</button>
							) : (
								<span className="text-ink-2" title={r.label}>
									{r.label}
								</span>
							)}
						</span>
						<span className="flex items-center border-b border-rule px-3 py-2.5">
							<span className="w-full">
								<ShareBar share={r.share} lead={r.lead} />
							</span>
						</span>
						{columns.map((c, i) => (
							<span
								key={c.key}
								className={`border-b border-rule py-2.5 pl-3 text-right ${i === 0 ? "font-medium text-foreground" : "text-ink-2"}`}
							>
								{r.cells[c.key] ?? "—"}
							</span>
						))}
						{rowAction && (
							<span className="flex items-center justify-end border-b border-rule py-2.5">
								{r.drillable && rowAction(r.key)}
							</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
