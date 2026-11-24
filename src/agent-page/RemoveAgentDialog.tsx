import { useAgentRemoval } from "@/agent-page/useAgentRemoval";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { BoxedCheckList } from "@/shared/MultiSelect";
import { SectionTitle } from "@/shared/SectionTitle";
import { Spinner } from "@/shared/Spinner";
import { TypedConfirmField } from "@/shared/TypedConfirmField";
import { WriteList } from "@/shared/WriteList";
import { WriteRun } from "@/shared/WriteRun";
import type { ShortcutTarget } from "@/shortcuts/registry";

export function RemoveAgentDialog({
	target,
	onClose,
}: {
	target: ShortcutTarget;
	onClose: () => void;
}) {
	const removal = useAgentRemoval(target);
	const { run } = removal;
	const running = run.phase === "running";

	return (
		<Dialog open onOpenChange={(open) => !open && !running && onClose()}>
			<DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Remove agent "{target.label}"?</DialogTitle>
					<DialogDescription>
						Deletes the agent and what was made for it. This cannot be undone.
					</DialogDescription>
				</DialogHeader>

				{run.phase !== "idle" ? (
					<WriteRun
						title="Removing the agent"
						phase={run.phase}
						items={run.items}
						doneCount={run.doneCount}
						error={run.error}
						onRetry={run.retry}
						onEdit={run.reset}
					/>
				) : removal.loadError ? (
					<p role="alert" className="text-xs text-destructive">
						{removal.loadError}
					</p>
				) : !removal.loaded ? (
					<div className="flex justify-center py-6">
						<Spinner />
					</div>
				) : (
					<>
						<section>
							<SectionTitle>Deleted, in this order</SectionTitle>
							<WriteList items={removal.planned} />
						</section>
						{removal.options.length > 0 && (
							<section>
								<SectionTitle>Made for this agent</SectionTitle>
								<p className="mb-2 text-xs text-muted-foreground">
									Ticked rows are deleted; untick one to keep it.
								</p>
								<fieldset aria-label="Made for this agent" className="min-w-0">
									<BoxedCheckList
										options={removal.options}
										selected={removal.ticked}
										onToggle={removal.toggle}
										emptyLabel="rows"
									/>
								</fieldset>
							</section>
						)}
						<TypedConfirmField
							expected={target.name}
							value={removal.typed}
							onChange={removal.setTyped}
							label="Type the agent's name to confirm"
						/>
					</>
				)}

				{run.phase === "idle" && (
					<DialogFooter>
						<Button type="button" variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={removal.remove}
							disabled={!removal.canRemove}
						>
							Remove agent
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
