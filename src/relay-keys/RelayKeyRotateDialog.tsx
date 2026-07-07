import { useState } from "react";
import { useRotateRelayKey } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import type { RelayKey } from "@/api/types/relayKey";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { SecretReveal } from "@/relay-keys/SecretReveal";
import { AlertBanner } from "@/shared/AlertBanner";
import { toast } from "@/shared/Toast";

interface RelayKeyRotateDialogProps {
	rk: RelayKey;
	onClose: () => void;
}

export function RelayKeyRotateDialog({
	rk,
	onClose,
}: RelayKeyRotateDialogProps) {
	const [plaintext, setPlaintext] = useState<string | null>(null);
	const [inlineError, setInlineError] = useState<string | undefined>();
	const rotateRelayKey = useRotateRelayKey();

	async function handleRotate() {
		setInlineError(undefined);
		try {
			const { plaintext: secret } = await rotateRelayKey.mutateAsync({
				id: rk.metadata.id ?? "",
			});
			setPlaintext(secret);
			toast("success", "Relay key rotated.");
		} catch (err) {
			setInlineError(
				err instanceof ApiError
					? err.body.message
					: "Failed to rotate. Please try again.",
			);
		}
	}

	const rotated = plaintext !== null;

	return (
		<Dialog
			open
			onOpenChange={(next) => !next && !rotateRelayKey.isPending && onClose()}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						Rotate{" "}
						<span className="font-mono text-sm font-normal text-muted-foreground">
							{rk.metadata.name}
						</span>
					</DialogTitle>
					<DialogDescription>
						{rotated
							? "Copy the new secret now — it won't be shown again. The old token stops working within ~1s."
							: "The server mints a fresh secret and the current one stops authenticating within ~1s fleet-wide. Apps using the old token must be updated."}
					</DialogDescription>
				</DialogHeader>

				{inlineError && (
					<AlertBanner severity="error">{inlineError}</AlertBanner>
				)}

				{rotated ? <SecretReveal secret={plaintext} /> : null}

				<DialogFooter>
					{rotated ? (
						<Button type="button" onClick={onClose}>
							Done
						</Button>
					) : (
						<>
							<Button
								type="button"
								variant="ghost"
								onClick={onClose}
								disabled={rotateRelayKey.isPending}
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={() => void handleRotate()}
								disabled={rotateRelayKey.isPending}
							>
								{rotateRelayKey.isPending ? "Rotating…" : "Rotate"}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
