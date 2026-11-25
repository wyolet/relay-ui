import { Button } from "@/components/ui/button";
import type { WriteRunPhase } from "@/hooks/useWriteRunner";
import { Spinner } from "@/shared/Spinner";
import { WriteList, type WriteListItem } from "@/shared/WriteList";

/**
 * A multi-write form's requests as they run; a failed one stops the run and
 * offers a retry from there, or the form again when nothing was written yet.
 */
export function WriteRun({
	title,
	phase,
	items,
	doneCount,
	error,
	onRetry,
	onEdit,
}: {
	/** What is being made, e.g. "Creating the agent". */
	title: string;
	phase: WriteRunPhase;
	items: readonly WriteListItem[];
	doneCount: number;
	error: string | null;
	onRetry: () => void;
	onEdit: () => void;
}) {
	const failed = phase === "failed";
	const nothingWritten = doneCount === 0;
	// A one-request write has no steps to list: its title is the whole status.
	const single = items.length === 0;
	return (
		<div className="flex flex-col gap-4">
			<div role={single ? "status" : undefined}>
				<h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
					{single && !failed && <Spinner className="size-3.5" />}
					{failed ? "Stopped" : title}
				</h2>
				{failed && (
					<p className="mt-1 text-xs text-muted-foreground">
						Retry continues from the step that failed.
					</p>
				)}
			</div>
			{!single && (
				<div role="status">
					<WriteList items={items} error={error} />
				</div>
			)}
			{failed && !nothingWritten && (
				<p className="text-xs text-muted-foreground">
					{doneCount} of {items.length} steps are done and kept.
				</p>
			)}
			{failed && (
				<div className="flex items-center gap-2">
					<Button type="button" onClick={onRetry}>
						Retry
					</Button>
					{nothingWritten && (
						<Button type="button" variant="outline" onClick={onEdit}>
							Back to the form
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
