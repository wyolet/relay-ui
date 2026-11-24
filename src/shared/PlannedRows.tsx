import type { components } from "@/api/types.gen";
import {
	type PlannedRowLists,
	plannedGroups,
	rowKindLabel,
} from "@/pseudo/dryRun";
import { StaleContent } from "@/shared/StaleContent";
import { TextPlaceholder } from "@/shared/TextPlaceholder";

type CreatedRow = components["schemas"]["CreatedRow"];

const PLACEHOLDER_WIDTHS = ["w-40", "w-48", "w-36", "w-44"];

function RowList({
	rows,
	label,
}: {
	rows: readonly CreatedRow[];
	label: string;
}) {
	return (
		<ol aria-label={label} className="flex max-w-md flex-col gap-2">
			{rows.map((row) => (
				<li key={row.id} className="grid grid-cols-[8rem_1fr] gap-3 text-xs">
					<span className="text-muted-foreground">
						{rowKindLabel(row.kind)}
					</span>
					<span className="truncate font-mono text-foreground">{row.name}</span>
				</li>
			))}
		</ol>
	);
}

/** The rows a dry run says the write makes, changes and deletes, in write order; one group shows without a heading. */
export function PlannedRows({
	rows,
	label,
	loading,
	stale,
}: {
	rows: PlannedRowLists;
	/** Names the list, e.g. "What Create agent makes". */
	label: string;
	/** No list yet. */
	loading: boolean;
	/** The list is from earlier answers; a newer one is on its way. */
	stale: boolean;
}) {
	if (loading) {
		return (
			<div className="flex max-w-md flex-col gap-2 text-xs">
				<span className="sr-only" role="status">
					Asking relay what it makes
				</span>
				{PLACEHOLDER_WIDTHS.map((w) => (
					<span key={w} aria-hidden>
						<TextPlaceholder width={w} />
					</span>
				))}
			</div>
		);
	}
	const groups = plannedGroups(rows);
	return (
		<StaleContent stale={stale}>
			{groups.length > 1 ? (
				<section aria-label={label} className="flex max-w-md flex-col gap-4">
					{groups.map((group) => (
						<div key={group.heading} className="flex flex-col gap-2">
							<h3 className="text-xs font-medium text-foreground">
								{group.heading}
							</h3>
							<RowList rows={group.rows} label={group.heading} />
						</div>
					))}
				</section>
			) : (
				<RowList rows={groups[0]?.rows ?? []} label={label} />
			)}
		</StaleContent>
	);
}
