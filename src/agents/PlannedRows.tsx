import type { components } from "@/api/types.gen";
import { TextPlaceholder } from "@/shared/TextPlaceholder";

type CreatedRow = components["schemas"]["CreatedRow"];

const PLACEHOLDER_WIDTHS = ["w-40", "w-48", "w-36", "w-44"];

/** The rows a dry run says Create agent makes, in write order. */
export function PlannedRows({
	rows,
	pending,
}: {
	rows: readonly CreatedRow[];
	pending: boolean;
}) {
	if (pending) {
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
		<ol
			aria-label="What Create agent makes"
			className="flex max-w-md flex-col gap-2"
		>
			{rows.map((row) => (
				<li key={row.id} className="grid grid-cols-[8rem_1fr] gap-3 text-xs">
					<span className="text-muted-foreground">
						{row.kind.replaceAll("-", " ")}
					</span>
					<span className="truncate font-mono text-foreground">{row.name}</span>
				</li>
			))}
		</ol>
	);
}
