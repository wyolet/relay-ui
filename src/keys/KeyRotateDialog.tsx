import { useState } from "react";
import { useRotateKey } from "@/api/hooks/keys";
import { ApiError } from "@/api/types/errors";
import type { Key } from "@/api/types/key";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { SecretReveal } from "@/keys/SecretReveal";
import { AlertBanner } from "@/shared/AlertBanner";
import { Segmented } from "@/shared/Segmented";
import { toast } from "@/shared/Toast";

interface KeyRotateDialogProps {
	rk: Key;
	onClose: () => void;
}

/** Grace windows offered in the dialog. 0 cuts the old secret immediately;
 * the rest stay under the server's 24h default maximum. */
const GRACE_OPTIONS = [
	{ value: "0", label: "Immediate" },
	{ value: "300", label: "5 min" },
	{ value: "3600", label: "1 hour" },
	{ value: "86400", label: "24 hours" },
] as const;

export function KeyRotateDialog({ rk, onClose }: KeyRotateDialogProps) {
	const [plaintext, setPlaintext] = useState<string | null>(null);
	const [inlineError, setInlineError] = useState<string | undefined>();
	const [graceSeconds, setGraceSeconds] = useState("0");
	const rotateKey = useRotateKey();

	async function handleRotate() {
		setInlineError(undefined);
		try {
			const { plaintext: secret } = await rotateKey.mutateAsync({
				id: rk.metadata.id ?? "",
				graceSeconds: Number(graceSeconds),
			});
			setPlaintext(secret);
			toast("success", "Key rotated.");
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
			onOpenChange={(next) => !next && !rotateKey.isPending && onClose()}
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
							? "Copy the new secret now — it won't be shown again."
							: "The server mints a fresh secret. The current one stops authenticating once the grace period ends (within ~1s fleet-wide when immediate)."}
					</DialogDescription>
				</DialogHeader>

				{inlineError && (
					<AlertBanner severity="error">{inlineError}</AlertBanner>
				)}

				{rotated ? (
					<SecretReveal secret={plaintext} />
				) : (
					<div className="flex flex-col gap-1.5">
						<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
							Grace period
						</span>
						<Segmented
							options={GRACE_OPTIONS}
							value={graceSeconds}
							onChange={setGraceSeconds}
						/>
						<p className="text-[11px] text-muted-foreground">
							How long the current secret keeps authenticating alongside the new
							one. A rejected value means the relay's configured maximum is
							lower — the error says what it is.
						</p>
					</div>
				)}

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
								disabled={rotateKey.isPending}
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={() => void handleRotate()}
								disabled={rotateKey.isPending}
							>
								{rotateKey.isPending ? "Rotating…" : "Rotate"}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
