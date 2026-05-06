import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { DeleteConfirm } from "./DeleteConfirm";

export interface DetailField {
	label: string;
	value: ReactNode;
}

interface ResourceDetailProps {
	title: string;
	fields: DetailField[];
	editTo: string;
	backTo: string;
	backLabel: string;
	onDelete: () => Promise<void>;
	isDeleting?: boolean;
}

export function ResourceDetail({
	title,
	fields,
	editTo,
	backTo,
	backLabel,
	onDelete,
	isDeleting = false,
}: ResourceDetailProps) {
	const navigate = useNavigate();
	const [confirming, setConfirming] = useState(false);

	async function handleConfirmDelete() {
		await onDelete();
		void navigate({ to: backTo });
	}

	return (
		<div>
			<div className="mb-6 flex items-center gap-3">
				<Link to={backTo} className="text-sm text-blue-600 hover:underline">
					← {backLabel}
				</Link>
			</div>

			<div className="flex items-start justify-between mb-6">
				<h1 className="text-2xl font-bold text-gray-900 font-mono">{title}</h1>
				<div className="flex gap-2">
					<Link
						to={editTo}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Edit
					</Link>
					<button
						type="button"
						onClick={() => setConfirming(true)}
						className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
					>
						Delete
					</button>
				</div>
			</div>

			<dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
				{fields.map((f) => (
					<div
						key={f.label}
						className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4"
					>
						<dt className="text-sm font-medium text-gray-500">{f.label}</dt>
						<dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
							{f.value ?? <span className="text-gray-400">—</span>}
						</dd>
					</div>
				))}
			</dl>

			{confirming && (
				<DeleteConfirm
					resourceName={title}
					onConfirm={() => void handleConfirmDelete()}
					onCancel={() => setConfirming(false)}
					isPending={isDeleting}
				/>
			)}
		</div>
	);
}
