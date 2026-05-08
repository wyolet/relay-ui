import { useState } from "react";

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

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-confirm-title"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
		>
			<div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl dark:shadow-black/40 p-6 max-w-sm w-full mx-4">
				<h2
					id="delete-confirm-title"
					className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2"
				>
					Delete "{resourceName}"?
				</h2>
				<p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
					This action cannot be undone. Type{" "}
					<span className="font-mono font-bold">{resourceName}</span> to
					confirm.
				</p>
				<input
					type="text"
					value={typed}
					onChange={(e) => setTyped(e.target.value)}
					placeholder={resourceName}
					className="w-full border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono mb-4 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-400"
				/>
				<div className="flex gap-3 justify-end">
					<button
						type="button"
						onClick={onCancel}
						disabled={isPending}
						className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={typed !== resourceName || isPending}
						className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isPending ? "Deleting…" : "Delete"}
					</button>
				</div>
			</div>
		</div>
	);
}
