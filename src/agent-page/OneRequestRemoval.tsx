import {
	ConfirmAgentName,
	HiddenRowsLine,
	MadeForAgent,
	RemoveAgentFrame,
} from "@/agent-page/RemoveAgentFrame";
import {
	type PseudoAgentRemoval,
	usePseudoAgentRemoval,
} from "@/agent-page/usePseudoAgentRemoval";
import { DeleteBlockers } from "@/shared/DeleteBlockers";
import { DryRunReview } from "@/shared/DryRunReview";
import { PlannedRows } from "@/shared/PlannedRows";
import { SectionTitle } from "@/shared/SectionTitle";
import { Spinner } from "@/shared/Spinner";
import type { ShortcutTarget } from "@/shortcuts/registry";

const CHANGED_TITLE = "Changed and kept";

export function OneRequestRemoval({
	target,
	onClose,
}: {
	target: ShortcutTarget;
	onClose: () => void;
}) {
	const removal = usePseudoAgentRemoval(target);

	return (
		<RemoveAgentFrame
			target={target}
			running={removal.running}
			idle={!removal.running}
			canRemove={removal.canRemove}
			closeOnly={removal.denied}
			onRemove={removal.remove}
			onClose={onClose}
		>
			{removal.running ? (
				<div
					role="status"
					className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground"
				>
					<Spinner />
					Removing the agent
				</div>
			) : !removal.loaded ? (
				<div className="flex justify-center py-6">
					<Spinner />
				</div>
			) : (
				<>
					{removal.blockers.length > 0 && (
						<DeleteBlockers groups={removal.blockers} />
					)}
					{removal.listed ? (
						<RemovalLists removal={removal} target={target} />
					) : (
						removal.refusalMessage && (
							<p role="alert" className="text-xs text-destructive">
								{removal.refusalMessage}
							</p>
						)
					)}
				</>
			)}
		</RemoveAgentFrame>
	);
}

/** What relay listed: deleted, changed, the labelled rows to tick, then the name to confirm. */
function RemovalLists({
	removal,
	target,
}: {
	removal: PseudoAgentRemoval;
	target: ShortcutTarget;
}) {
	return (
		<>
			<section>
				<SectionTitle>Deleted, in this order</SectionTitle>
				<DryRunReview
					issues={removal.issues}
					warnings={removal.warnings}
					refusalMessage={removal.refusalMessage}
					rows={{ deleted: removal.deleted }}
					label="Deleted, in this order"
					loading={false}
					stale={removal.stale}
				/>
				<HiddenRowsLine line={removal.deletedHiddenLine} />
			</section>
			{(removal.updated.length > 0 || removal.updatedHiddenLine) && (
				<section>
					<SectionTitle>{CHANGED_TITLE}</SectionTitle>
					<PlannedRows
						rows={{ updated: removal.updated }}
						label={CHANGED_TITLE}
						loading={false}
						stale={removal.stale}
					/>
					<HiddenRowsLine line={removal.updatedHiddenLine} />
				</section>
			)}
			<MadeForAgent
				options={removal.options}
				ticked={removal.ticked}
				onToggle={removal.toggle}
				hiddenLine={removal.keptHiddenLine}
			/>
			<ConfirmAgentName
				target={target}
				value={removal.typed}
				onChange={removal.setTyped}
			/>
		</>
	);
}
