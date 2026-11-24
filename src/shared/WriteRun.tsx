import { Button } from "@/components/ui/button";
import type { WriteRunPhase } from "@/hooks/useWriteRunner";
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
	return (
		<div className="flex flex-col gap-4">
			<div>
				<h2 className="text-sm font-semibold text-foreground">
					{failed ? "Stopped" : title}
				</h2>
				{failed && (
					<p className="mt-1 text-xs text-muted-foreground">
						Retry continues from the step that failed.
					</p>
				)}
			</div>
			<div role="status">
				<WriteList items={items} error={error} />
			</div>
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
