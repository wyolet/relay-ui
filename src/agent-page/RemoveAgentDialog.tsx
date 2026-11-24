import { OneRequestRemoval } from "@/agent-page/OneRequestRemoval";
import {
	ConfirmAgentName,
	MadeForAgent,
	RemoveAgentFrame,
} from "@/agent-page/RemoveAgentFrame";
import { useAgentRemoval } from "@/agent-page/useAgentRemoval";
import { removesInOneRequest } from "@/agent-page/usePseudoAgentRemoval";
import { SectionTitle } from "@/shared/SectionTitle";
import { Spinner } from "@/shared/Spinner";
import { WriteList } from "@/shared/WriteList";
import { WriteRun } from "@/shared/WriteRun";
import type { ShortcutTarget } from "@/shortcuts/registry";

interface RemovalProps {
	target: ShortcutTarget;
	onClose: () => void;
}

export function RemoveAgentDialog(props: RemovalProps) {
	return removesInOneRequest() ? (
		<OneRequestRemoval {...props} />
	) : (
		<ChainRemoval {...props} />
	);
}

function ChainRemoval({ target, onClose }: RemovalProps) {
	const removal = useAgentRemoval(target);
	const { run } = removal;

	return (
		<RemoveAgentFrame
			target={target}
			running={run.phase === "running"}
			idle={run.phase === "idle"}
			canRemove={removal.canRemove}
			onRemove={removal.remove}
			onClose={onClose}
		>
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
