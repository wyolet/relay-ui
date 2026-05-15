import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
	const inputId = useId();

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
				<div>
					<label
						htmlFor={inputId}
						className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1"
					>
						Resource name
					</label>
					<Input
						id={inputId}
						type="text"
						value={typed}
						onChange={(e) => setTyped(e.currentTarget.value)}
						placeholder={resourceName}
						autoFocus
						autoComplete="off"
						className="font-mono"
					/>
				</div>
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
