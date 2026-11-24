import { rowKindLabel } from "@/agents/rowKindLabel";
import type { components } from "@/api/types.gen";
import { StaleContent } from "@/shared/StaleContent";
import { TextPlaceholder } from "@/shared/TextPlaceholder";

type CreatedRow = components["schemas"]["CreatedRow"];

const PLACEHOLDER_WIDTHS = ["w-40", "w-48", "w-36", "w-44"];

/** The rows a dry run says Create agent makes, in write order. */
export function PlannedRows({
	rows,
	loading,
	stale,
}: {
	rows: readonly CreatedRow[];
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
	return (
		<StaleContent stale={stale}>
			<ol
				aria-label="What Create agent makes"
				className="flex max-w-md flex-col gap-2"
			>
				{rows.map((row) => (
					<li key={row.id} className="grid grid-cols-[8rem_1fr] gap-3 text-xs">
						<span className="text-muted-foreground">
							{rowKindLabel(row.kind)}
						</span>
						<span className="truncate font-mono text-foreground">
							{row.name}
						</span>
					</li>
				))}
			</ol>
		</StaleContent>
	);
}
