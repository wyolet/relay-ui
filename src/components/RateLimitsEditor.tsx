/**
 * Inline rate limits editor for Pool, Secret, and Model forms.
 * Renders a list of RateLimitRef rows with ratelimit + meter selects,
 * a remove button per row, and an "Add row" button.
 */
import { useRef, useState } from "react";
import type { RateLimitRef } from "#/api/types/ratelimit";

interface RateLimitsEditorProps {
	value: RateLimitRef[];
	onChange: (next: RateLimitRef[]) => void;
	availableRateLimits: string[];
}

const METER_OPTIONS: RateLimitRef["meter"][] = [
	"requests",
	"tokens",
	"concurrency",
];

// Internal row has a stable unique id for keying.
interface Row {
	id: number;
	ref: RateLimitRef;
}

function toRows(refs: RateLimitRef[], startId: number): Row[] {
	return refs.map((ref, i) => ({ id: startId + i, ref }));
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
		onChange(next.map((r) => r.ref));
	}

	function addRow() {
		const first = availableRateLimits[0] ?? "";
		const id = counter.current++;
		emit([...rows, { id, ref: { name: first, meter: "requests" } }]);
	}

	function removeRow(id: number) {
		emit(rows.filter((r) => r.id !== id));
	}

	function updateRow(id: number, patch: Partial<RateLimitRef>) {
		emit(
			rows.map((r) =>
				r.id === id ? { ...r, ref: { ...r.ref, ...patch } } : r,
			),
		);
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<span className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
					Rate Limits
				</span>
				<button
					type="button"
					onClick={addRow}
					disabled={availableRateLimits.length === 0}
					className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
				>
					+ Add row
				</button>
			</div>

			{rows.length === 0 ? (
				<p className="text-sm text-gray-500 dark:text-zinc-400">
					No rate limits attached.
				</p>
			) : (
				<div className="space-y-2">
					{rows.map((row, idx) => (
						<div key={row.id} className="flex items-center gap-2">
							<select
								aria-label={`Rate limit name for row ${idx + 1}`}
								value={row.ref.name}
								onChange={(e) => updateRow(row.id, { name: e.target.value })}
								className="flex-1 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
							>
								{availableRateLimits.map((name) => (
									<option key={name} value={name}>
										{name}
									</option>
								))}
							</select>
							<select
								aria-label={`Meter for row ${idx + 1}`}
								value={row.ref.meter}
								onChange={(e) =>
									updateRow(row.id, {
										meter: e.target.value as RateLimitRef["meter"],
									})
								}
								className="border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
							>
								{METER_OPTIONS.map((m) => (
									<option key={m} value={m}>
										{m}
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
