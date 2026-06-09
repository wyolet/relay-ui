import { Check, Copy } from "lucide-react";
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
import { AlertBanner } from "@/shared/AlertBanner";
import { toast } from "@/shared/Toast";

interface RelayKeyRotateDialogProps {
	rk: RelayKey;
	onClose: () => void;
}

export function RelayKeyRotateDialog({ rk, onClose }: RelayKeyRotateDialogProps) {
	const [plaintext, setPlaintext] = useState<string | null>(null);
	const [inlineError, setInlineError] = useState<string | undefined>();
	const rotateRelayKey = useRotateRelayKey();

	async function handleRotate() {
		setInlineError(undefined);
		try {
			const { plaintext: secret } = await rotateRelayKey.mutateAsync(
				rk.metadata.id ?? "",
			);
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

				{rotated ? (
					<div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
						<code className="flex-1 text-xs font-mono text-foreground break-all">
							{plaintext}
						</code>
						<CopyInline text={plaintext} />
					</div>
				) : null}

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

function CopyInline({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 1_500);
		} catch {
			toast("error", "Couldn't copy to clipboard.");
		}
	}
	return (
		<button
			type="button"
			onClick={() => void handleCopy()}
			aria-label="Copy"
			className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
		>
			{copied ? (
				<Check className="w-4 h-4 text-primary" />
			) : (
				<Copy className="w-4 h-4" />
			)}
		</button>
	);
}
