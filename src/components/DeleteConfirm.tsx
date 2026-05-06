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
			<div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl dark:shadow-black/40 p-6 max-w-sm w-full mx-4">
				<h2
					id="delete-confirm-title"
					className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-2"
				>
					Delete "{resourceName}"?
				</h2>
				<p className="text-sm text-gray-600 dark:text-zinc-400 mb-4">
					This action cannot be undone. Type{" "}
					<span className="font-mono font-bold">{resourceName}</span> to
					confirm.
				</p>
				<input
					type="text"
					value={typed}
					onChange={(e) => setTyped(e.target.value)}
					placeholder={resourceName}
					className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono mb-4 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-400"
				/>
				<div className="flex gap-3 justify-end">
					<button
						type="button"
						onClick={onCancel}
						disabled={isPending}
						className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50"
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
