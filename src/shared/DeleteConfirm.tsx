import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { TypedConfirmField } from "@/shared/TypedConfirmField";

interface DeleteConfirmProps {
	resourceName: string;
	onConfirm: () => void;
	onCancel: () => void;
	isPending?: boolean;
}

export function DeleteConfirm({
	resourceName,
	onConfirm,
	onCancel,
	isPending = false,
}: DeleteConfirmProps) {
	const [typed, setTyped] = useState("");

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset typed value when the dialog targets a different resource
	useEffect(() => {
		setTyped("");
	}, [resourceName]);

	const matches = typed === resourceName;

	return (
		<Dialog open onOpenChange={(next) => !next && !isPending && onCancel()}>
			<DialogContent className="sm:max-w-md">
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
