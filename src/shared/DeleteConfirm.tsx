import { useEffect, useState } from "react";
import { isResourceInUse } from "@/api/types/errors";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { DeleteBlockers } from "@/shared/DeleteBlockers";
import { TypedConfirmField } from "@/shared/TypedConfirmField";

interface DeleteConfirmProps {
	resourceName: string;
	onConfirm: () => void;
	onCancel: () => void;
	isPending?: boolean;
	/** The delete mutation's error; a resource_in_use refusal lists its blockers here. */
	error?: unknown;
}

export function DeleteConfirm({
	resourceName,
	onConfirm,
	onCancel,
	isPending = false,
	error,
}: DeleteConfirmProps) {
	const [typed, setTyped] = useState("");

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset typed value when the dialog targets a different resource
	useEffect(() => {
		setTyped("");
	}, [resourceName]);

	const matches = typed === resourceName;
	const blockers = isResourceInUse(error) ? error.blockers : [];

	return (
		<Dialog open onOpenChange={(next) => !next && !isPending && onCancel()}>
			<DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Delete "{resourceName}"?</DialogTitle>
					<DialogDescription>
						This action cannot be undone. Type{" "}
						<code className="font-mono text-foreground/80">{resourceName}</code>{" "}
						to confirm.
					</DialogDescription>
				</DialogHeader>
				<TypedConfirmField
					expected={resourceName}
					value={typed}
					onChange={setTyped}
					label="Resource name"
				/>
				{blockers.length > 0 && <DeleteBlockers groups={blockers} />}
				<DialogFooter>
					<Button
						type="button"
						variant="ghost"
						onClick={onCancel}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={onConfirm}
						disabled={!matches || isPending}
					>
						{isPending ? "Deleting…" : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
