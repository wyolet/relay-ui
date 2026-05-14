import { useState } from "react";
import { useUpdateHostKey } from "@/api/hooks/hostkeys";
import { ApiError } from "@/api/types/errors";
import type { HostKey } from "@/api/types/hostkey";
import { toast } from "@/components/Toast";

interface SecretRotateDialogProps {
	hk: HostKey;
	onClose: () => void;
}

export function SecretRotateDialog({ hk, onClose }: SecretRotateDialogProps) {
	const [value, setValue] = useState("");
	const [inlineError, setInlineError] = useState<string | undefined>();
	const updateHostKey = useUpdateHostKey(hk.metadata.id ?? "");

	async function handleConfirm() {
		if (!value.trim()) {
			setInlineError("New value is required.");
			return;
		}
		setInlineError(undefined);
		try {
			await updateHostKey.mutateAsync({
				metadata: hk.metadata,
				spec: {
					...hk.spec,
					valueFrom: { kind: "stored" },
					value,
				},
			});
			setValue("");
			toast("success", "Host key rotated.");
			onClose();
		} catch (err) {
			if (err instanceof ApiError) {
				setInlineError(err.body.message);
			} else {
				setInlineError("Failed to rotate. Please try again.");
			}
		}
	}

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="rotate-dialog-title"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
		>
			<div className="bg-card rounded-xl shadow-xl dark:shadow-black/40 w-full max-w-md mx-4 p-6">
				<h2
					id="rotate-dialog-title"
					className="text-lg font-semibold text-foreground mb-4"
				>
					Rotate Host Key:{" "}
					<span className="font-mono">{hk.metadata.name}</span>
				</h2>

				{inlineError && (
					<div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300">
						{inlineError}
					</div>
				)}

				<div className="mb-6">
					<label
						htmlFor="rotate-value"
						className="block text-sm font-medium text-foreground mb-1"
					>
						New value{" "}
						<span className="ml-1 text-red-500" aria-hidden="true">
							*
						</span>
					</label>
					<input
						id="rotate-value"
						type="password"
						autoComplete="new-password"
						value={value}
						onChange={(e) => setValue(e.target.value)}
						placeholder="Enter new value"
						className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-400"
					/>
				</div>

				<div className="flex gap-3 justify-end">
					<button
						type="button"
						onClick={onClose}
						disabled={updateHostKey.isPending}
						className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-input rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => void handleConfirm()}
						disabled={updateHostKey.isPending}
						className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
					>
						{updateHostKey.isPending ? "Rotating…" : "Confirm"}
					</button>
				</div>
			</div>
		</div>
	);
}
