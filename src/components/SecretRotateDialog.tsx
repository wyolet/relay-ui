import { useState } from "react";
import { useUpdateSecret } from "#/api/hooks/secrets";
import { ApiError } from "#/api/types/errors";
import { toast } from "#/components/Toast";

interface SecretRotateDialogProps {
	name: string;
	onClose: () => void;
}

export function SecretRotateDialog({ name, onClose }: SecretRotateDialogProps) {
	const [value, setValue] = useState("");
	const [inlineError, setInlineError] = useState<string | undefined>();
	const updateSecret = useUpdateSecret(name);

	async function handleConfirm() {
		if (!value.trim()) {
			setInlineError("New value is required.");
			return;
		}
		setInlineError(undefined);
		try {
			await updateSecret.mutateAsync({
				value_from: { kind: "stored", value },
			});
			// SECURITY: Clear the value from state immediately after successful
			// submission so the cleartext never lingers in the DOM after success.
			setValue("");
			toast("success", "Secret rotated.");
			onClose();
		} catch (err) {
			if (err instanceof ApiError) {
				setInlineError(err.body.message);
			} else {
				setInlineError("Failed to rotate secret. Please try again.");
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
			<div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl dark:shadow-black/40 w-full max-w-md mx-4 p-6">
				<h2
					id="rotate-dialog-title"
					className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4"
				>
					Rotate Secret: <span className="font-mono">{name}</span>
				</h2>

				{inlineError && (
					<div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300">
						{inlineError}
					</div>
				)}

				<div className="mb-6">
					<label
						htmlFor="rotate-value"
						className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
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
						placeholder="Enter new secret value"
						className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
					/>
				</div>

				<div className="flex gap-3 justify-end">
					<button
						type="button"
						onClick={onClose}
						disabled={updateSecret.isPending}
						className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => void handleConfirm()}
						disabled={updateSecret.isPending}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
					>
						{updateSecret.isPending ? "Rotating…" : "Confirm"}
					</button>
				</div>
			</div>
		</div>
	);
}
