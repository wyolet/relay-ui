import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { BoxedCheckList, type CheckOption } from "@/shared/MultiSelect";
import { SectionTitle } from "@/shared/SectionTitle";
import { TypedConfirmField } from "@/shared/TypedConfirmField";
import type { ShortcutTarget } from "@/shortcuts/registry";

/** The Remove agent dialog around either way of removing; the footer shows until the removal starts. */
export function RemoveAgentFrame({
	target,
	running,
	idle,
	canRemove,
	onRemove,
	onClose,
	children,
}: {
	target: ShortcutTarget;
	/** Closing is refused while deletes are in flight. */
	running: boolean;
	idle: boolean;
	canRemove: boolean;
	onRemove: () => void;
	onClose: () => void;
	children: ReactNode;
}) {
	return (
		<Dialog open onOpenChange={(open) => !open && !running && onClose()}>
			<DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Remove agent "{target.label}"?</DialogTitle>
					<DialogDescription>
						Deletes the agent and what was made for it. This cannot be undone.
					</DialogDescription>
				</DialogHeader>
				{children}
				{idle && (
					<DialogFooter>
						<Button type="button" variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={onRemove}
							disabled={!canRemove}
						>
							Remove agent
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}

/** The policies and pools made for the agent, ticked to delete. */
export function MadeForAgent({
	options,
	ticked,
	onToggle,
}: {
	options: readonly CheckOption[];
	ticked: readonly string[];
	onToggle: (id: string) => void;
}) {
	if (options.length === 0) return null;
	return (
		<section>
			<SectionTitle>Made for this agent</SectionTitle>
			<p className="mb-2 text-xs text-muted-foreground">
				Ticked rows are deleted; untick one to keep it.
			</p>
			<fieldset aria-label="Made for this agent" className="min-w-0">
				<BoxedCheckList
					options={options}
					selected={ticked}
					onToggle={onToggle}
					emptyLabel="rows"
				/>
			</fieldset>
		</section>
	);
}

/** The agent's name, typed to confirm. */
export function ConfirmAgentName({
	target,
	value,
	onChange,
}: {
	target: ShortcutTarget;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<TypedConfirmField
			expected={target.name}
			value={value}
			onChange={onChange}
			label="Type the agent's name to confirm"
		/>
	);
}
