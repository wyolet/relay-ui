import {
	ConfirmAgentName,
	MadeForAgent,
	RemoveAgentFrame,
} from "@/agent-page/RemoveAgentFrame";
import { usePseudoAgentRemoval } from "@/agent-page/usePseudoAgentRemoval";
import { DeleteBlockers } from "@/shared/DeleteBlockers";
import { DryRunReview } from "@/shared/DryRunReview";
import { SectionTitle } from "@/shared/SectionTitle";
import { Spinner } from "@/shared/Spinner";
import type { ShortcutTarget } from "@/shortcuts/registry";

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
					<section>
						<SectionTitle>Deleted, in this order</SectionTitle>
						<DryRunReview
							issues={removal.issues}
							warnings={removal.warnings}
							refusalMessage={removal.refusalMessage}
							rows={removal.rows}
							label="Deleted, in this order"
							loading={false}
							stale={removal.stale}
						/>
					</section>
					<MadeForAgent
						options={removal.options}
						ticked={removal.ticked}
						onToggle={removal.toggle}
					/>
					<ConfirmAgentName
						target={target}
						value={removal.typed}
						onChange={removal.setTyped}
					/>
				</>
			)}
		</RemoveAgentFrame>
	);
}
