import { Button } from "@/components/ui/button";
import type { WriteRunPhase } from "@/hooks/useWriteRunner";
import { WriteList, type WriteListItem } from "@/shared/WriteList";

/** A multi-write form's requests as they run; a failed one stops the run and offers a retry from there. */
export function WriteRun({
	title,
	phase,
	items,
	error,
	onRetry,
}: {
	/** What is being made, e.g. "Creating the agent". */
	title: string;
	phase: WriteRunPhase;
	items: readonly WriteListItem[];
	error: string | null;
	onRetry: () => void;
}) {
	const failed = phase === "failed";
	return (
		<div className="flex flex-col gap-4">
			<div>
				<h2 className="text-sm font-semibold text-foreground">
					{failed ? "Stopped" : title}
				</h2>
				{failed && (
					<p className="mt-1 text-xs text-muted-foreground">
						The finished steps are kept. Retry continues from the one that
						failed.
					</p>
				)}
			</div>
			<WriteList items={items} error={error} />
			{failed && (
				<div>
					<Button type="button" onClick={onRetry}>
						Retry
					</Button>
				</div>
			)}
		</div>
	);
}
