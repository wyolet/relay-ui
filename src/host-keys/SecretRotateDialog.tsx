import { useId, useState } from "react";
import { useUpdateHostKey } from "@/api/hooks/hostkeys";
import { ApiError } from "@/api/types/errors";
import type { HostKey } from "@/api/types/hostkey";
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
import { AlertBanner } from "@/shared/AlertBanner";
import { toast } from "@/shared/Toast";

interface SecretRotateDialogProps {
	hk: HostKey;
	onClose: () => void;
}

export function SecretRotateDialog({ hk, onClose }: SecretRotateDialogProps) {
	const [value, setValue] = useState("");
	const [inlineError, setInlineError] = useState<string | undefined>();
	const inputId = useId();
	const updateHostKey = useUpdateHostKey();

	async function handleConfirm() {
		if (!value.trim()) {
			setInlineError("New value is required.");
			return;
		}
		setInlineError(undefined);
		try {
			await updateHostKey.mutateAsync({
				id: hk.metadata.id ?? "",
				body: {
					metadata: hk.metadata,
					spec: {
						...hk.spec,
						valueFrom: { kind: "stored" },
						value,
					},
				},
			});
			setValue("");
			toast("success", "Host key rotated.");
			onClose();
		} catch (err) {
			setInlineError(
				err instanceof ApiError
					? err.body.message
					: "Failed to rotate. Please try again.",
			);
		}
	}

	return (
		<Dialog
			open
			onOpenChange={(next) => !next && !updateHostKey.isPending && onClose()}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						Rotate{" "}
						<span className="font-mono text-sm font-normal text-muted-foreground">
							{hk.metadata.name}
						</span>
					</DialogTitle>
					<DialogDescription>
						Paste the new secret. It's hashed at rest; the plaintext leaves your
						browser once.
					</DialogDescription>
				</DialogHeader>

				{inlineError && (
					<AlertBanner severity="error">{inlineError}</AlertBanner>
				)}

				<div>
					<label
						htmlFor={inputId}
						className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1"
					>
						New value
					</label>
					<Input
						id={inputId}
						type="password"
						autoComplete="new-password"
						value={value}
						onChange={(e) => setValue(e.currentTarget.value)}
						placeholder="sk-…"
						autoFocus
					/>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="ghost"
						onClick={onClose}
						disabled={updateHostKey.isPending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={() => void handleConfirm()}
						disabled={updateHostKey.isPending}
					>
						{updateHostKey.isPending ? "Rotating…" : "Rotate"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
