/**
 * Inline rate-limits editor for Pool and Model forms.
 * Each row is just a reference to a named RateLimit resource;
 * meter/amount/source live on the RateLimit itself (rules[]).
 */
import { useRef, useState } from "react";
import type { RateLimitAttachment } from "#/api/types/ratelimit";

interface RateLimitsEditorProps {
	value: RateLimitAttachment[];
	onChange: (next: RateLimitAttachment[]) => void;
	availableRateLimits: string[];
}

interface Row {
	id: number;
	attachment: RateLimitAttachment;
}

function toRows(attachments: RateLimitAttachment[], startId: number): Row[] {
	return attachments.map((attachment, i) => ({ id: startId + i, attachment }));
}

export function RateLimitsEditor({
	value,
	onChange,
	availableRateLimits,
}: RateLimitsEditorProps) {
	const counter = useRef(value.length);
	const [rows, setRows] = useState<Row[]>(() => toRows(value, 0));

	function emit(next: Row[]) {
		setRows(next);
		onChange(next.map((r) => r.attachment));
	}

	function addRow() {
		const first = availableRateLimits[0] ?? "";
		const id = counter.current++;
		emit([...rows, { id, attachment: { Ref: first } }]);
	}

	function removeRow(id: number) {
		emit(rows.filter((r) => r.id !== id));
	}

	function updateRow(id: number, patch: Partial<RateLimitAttachment>) {
		emit(
			rows.map((r) =>
				r.id === id ? { ...r, attachment: { ...r.attachment, ...patch } } : r,
			),
		);
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
					Rate Limits
				</span>
				<button
					type="button"
					onClick={addRow}
					disabled={availableRateLimits.length === 0}
					className="text-xs px-3 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
				>
					+ Add row
				</button>
			</div>

			{rows.length === 0 ? (
				<p className="text-sm text-neutral-500 dark:text-neutral-400">
					No rate limits attached.
				</p>
			) : (
				<div className="space-y-2">
					{rows.map((row, idx) => (
						<div key={row.id} className="flex items-center gap-2">
							<select
								aria-label={`Rate limit name for row ${idx + 1}`}
								value={row.attachment.Ref}
								onChange={(e) => updateRow(row.id, { Ref: e.target.value })}
								className="flex-1 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
							>
								{availableRateLimits.map((name) => (
									<option key={name} value={name}>
										{name}
									</option>
								))}
							</select>
							<button
								type="button"
								aria-label={`Remove rate limit row ${idx + 1}`}
								onClick={() => removeRow(row.id)}
								className="text-sm text-red-600 hover:text-red-800 dark:hover:text-red-400 transition-colors px-2 py-1"
							>
								×
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
