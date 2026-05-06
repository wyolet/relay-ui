/**
 * Global attachments view (PER-279).
 *
 * Design decisions:
 * - Orphaned RateLimits (zero attachments): rendered as synthetic amber rows
 *   in a separate "Orphaned Rate Limits" section below the main table, with a
 *   tooltip explaining the issue. This is cleaner than mixing them inline
 *   because they have no attachment ID, no meter, and no parent — mixing them
 *   with real rows would require awkward null handling.
 * - Duplicate-meter rows: detected client-side by grouping on
 *   (parent_kind, parent_name, meter). Highlighted amber in-place with a
 *   title tooltip.
 * - Detach: uses inline window.confirm (not DeleteConfirm which requires
 *   typing the resource name) because attachments are recoverable — the user
 *   can re-attach at any time. This keeps the UX snappy.
 * - Add attachment dialog: parent kind → parent name (fetches pools/secrets/
 *   models list for the selected kind) → rate limit → meter.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	allAttachmentsQueryOptions,
	useAllAttachments,
	useCreateAttachment,
	useDeleteAttachmentGlobal,
} from "#/api/hooks/attachments";
import { modelsListQueryOptions, useModels } from "#/api/hooks/models";
import { poolsListQueryOptions, usePools } from "#/api/hooks/pools";
import {
	rateLimitsListQueryOptions,
	useRateLimits,
} from "#/api/hooks/ratelimits";
import { secretsListQueryOptions, useSecrets } from "#/api/hooks/secrets";
import type {
	AttachmentMeter,
	AttachmentParentKind,
} from "#/api/types/attachment";
import { ApiError } from "#/api/types/errors";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/attachments")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(allAttachmentsQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(poolsListQueryOptions),
			context.queryClient.ensureQueryData(secretsListQueryOptions),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
		]),
	component: AttachmentsPage,
});

// ---- Filter state ----

type KindFilter = "all" | AttachmentParentKind;
type MeterFilter = "all" | AttachmentMeter;

// ---- Parent-name link helper ----

function parentLink(kind: AttachmentParentKind, name: string) {
	if (kind === "pool") {
		return (
			<Link
				to="/pools/$name"
				params={{ name }}
				className="text-blue-600 hover:underline font-mono text-xs"
			>
				{name}
			</Link>
		);
	}
	if (kind === "secret") {
		return (
			<Link
				to="/secrets/$name"
				params={{ name }}
				className="text-blue-600 hover:underline font-mono text-xs"
			>
				{name}
			</Link>
		);
	}
	// model
	return (
		<Link
			to="/models/$name"
			params={{ name }}
			className="text-blue-600 hover:underline font-mono text-xs"
		>
			{name}
		</Link>
	);
}

// ---- Add Attachment Dialog ----

interface AddDialogProps {
	onClose: () => void;
}

function AddAttachmentDialog({ onClose }: AddDialogProps) {
	const { data: poolsData } = usePools();
	const { data: secretsData } = useSecrets();
	const { data: modelsData } = useModels();
	const { data: rateLimitsData } = useRateLimits();

	const [parentKind, setParentKind] = useState<AttachmentParentKind>("pool");
	const [parentName, setParentName] = useState("");
	const [ratelimitName, setRatelimitName] = useState("");
	const [meter, setMeter] = useState<AttachmentMeter>("requests");

	const createAttachment = useCreateAttachment();

	const parentNames: string[] =
		parentKind === "pool"
			? poolsData.items.map((p) => p.name)
			: parentKind === "secret"
				? secretsData.items.map((s) => s.name)
				: modelsData.items.map((m) => m.name);

	async function handleSubmit() {
		if (!parentName || !ratelimitName) return;
		try {
			await createAttachment.mutateAsync({
				parent_kind: parentKind,
				parent_name: parentName,
				ratelimit_name: ratelimitName,
				meter,
			});
			toast("success", "Attachment created.");
			onClose();
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to create attachment.");
			}
		}
	}

	function handleKindChange(kind: AttachmentParentKind) {
		setParentKind(kind);
		setParentName("");
	}

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="add-attachment-title"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
		>
			<div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl dark:shadow-black/40 w-full max-w-md p-6">
				<h2
					id="add-attachment-title"
					className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4"
				>
					Add Attachment
				</h2>
				<div className="space-y-4">
					{/* Parent Kind */}
					<div>
						<label
							htmlFor="add-parent-kind"
							className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
						>
							Parent Kind
						</label>
						<select
							id="add-parent-kind"
							value={parentKind}
							onChange={(e) =>
								handleKindChange(e.target.value as AttachmentParentKind)
							}
							className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
						>
							<option value="pool">Pool</option>
							<option value="secret">Secret</option>
							<option value="model">Model</option>
						</select>
					</div>

					{/* Parent Name */}
					<div>
						<label
							htmlFor="add-parent-name"
							className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
						>
							Parent Name
						</label>
						<select
							id="add-parent-name"
							value={parentName}
							onChange={(e) => setParentName(e.target.value)}
							className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
						>
							<option value="">— select —</option>
							{parentNames.map((n) => (
								<option key={n} value={n}>
									{n}
								</option>
							))}
						</select>
					</div>

					{/* Rate Limit */}
					<div>
						<label
							htmlFor="add-ratelimit"
							className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
						>
							Rate Limit
						</label>
						<select
							id="add-ratelimit"
							value={ratelimitName}
							onChange={(e) => setRatelimitName(e.target.value)}
							className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
						>
							<option value="">— select —</option>
							{rateLimitsData.items.map((rl) => (
								<option key={rl.name} value={rl.name}>
									{rl.name}
								</option>
							))}
						</select>
					</div>

					{/* Meter */}
					<div>
						<label
							htmlFor="add-meter"
							className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
						>
							Meter
						</label>
						<select
							id="add-meter"
							value={meter}
							onChange={(e) => setMeter(e.target.value as AttachmentMeter)}
							className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
						>
							<option value="requests">Requests</option>
							<option value="tokens">Tokens</option>
							<option value="concurrency">Concurrency</option>
						</select>
					</div>
				</div>

				<div className="flex gap-3 mt-6">
					<button
						type="button"
						disabled={
							!parentName || !ratelimitName || createAttachment.isPending
						}
						onClick={() => void handleSubmit()}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
					>
						{createAttachment.isPending ? "Creating…" : "Create"}
					</button>
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
}

// ---- Main inner component (inside Suspense) ----

function AttachmentsInner() {
	const { data: attachmentsData } = useAllAttachments();
	const { data: rateLimitsData } = useRateLimits();

	const deleteAttachment = useDeleteAttachmentGlobal();

	// Filters
	const [kindFilter, setKindFilter] = useState<KindFilter>("all");
	const [parentNameFilter, setParentNameFilter] = useState("");
	const [rateLimitFilter, setRateLimitFilter] = useState("");
	const [meterFilter, setMeterFilter] = useState<MeterFilter>("all");
	const [showAddDialog, setShowAddDialog] = useState(false);

	const allItems = attachmentsData.items;

	// Compute duplicate-meter set: key = `${parent_kind}|${parent_name}|${meter}`
	// A key is "duplicate" if 2+ different ratelimit_names share it.
	const meterGroups = new Map<string, Set<string>>();
	for (const att of allItems) {
		const key = `${att.parent_kind}|${att.parent_name}|${att.meter}`;
		const existing = meterGroups.get(key);
		if (existing) {
			existing.add(att.ratelimit_name);
		} else {
			meterGroups.set(key, new Set([att.ratelimit_name]));
		}
	}
	const duplicateMeterKeys = new Set<string>();
	for (const [key, rlNames] of meterGroups) {
		if (rlNames.size > 1) {
			duplicateMeterKeys.add(key);
		}
	}

	// Orphaned rate limits
	const attachedRlNames = new Set(allItems.map((a) => a.ratelimit_name));
	const orphanedRateLimits = rateLimitsData.items.filter(
		(rl) => !attachedRlNames.has(rl.name),
	);

	// Apply filters
	const filteredItems = allItems.filter((att) => {
		if (kindFilter !== "all" && att.parent_kind !== kindFilter) return false;
		if (
			parentNameFilter &&
			!att.parent_name.toLowerCase().includes(parentNameFilter.toLowerCase())
		)
			return false;
		if (
			rateLimitFilter &&
			!att.ratelimit_name.toLowerCase().includes(rateLimitFilter.toLowerCase())
		)
			return false;
		if (meterFilter !== "all" && att.meter !== meterFilter) return false;
		return true;
	});

	async function handleDetach(id: string, rlName: string) {
		if (
			!window.confirm(
				`Detach rate limit "${rlName}"? This can be re-added later.`,
			)
		)
			return;
		try {
			await deleteAttachment.mutateAsync(id);
			toast("success", "Attachment removed.");
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to remove attachment.");
			}
		}
	}

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
						Attachments
					</h1>
					<p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
						Rate limit attachments across all resources.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowAddDialog(true)}
					className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
				>
					+ Add attachment
				</button>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-3 mb-6">
				{/* Kind filter */}
				<select
					value={kindFilter}
					onChange={(e) => setKindFilter(e.target.value as KindFilter)}
					className="border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
					aria-label="Filter by parent kind"
				>
					<option value="all">All kinds</option>
					<option value="pool">Pool</option>
					<option value="secret">Secret</option>
					<option value="model">Model</option>
				</select>

				{/* Parent name filter */}
				<input
					type="search"
					placeholder="Filter parent name…"
					value={parentNameFilter}
					onChange={(e) => setParentNameFilter(e.target.value)}
					className="border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-40"
					aria-label="Filter by parent name"
				/>

				{/* Rate limit filter */}
				<input
					type="search"
					placeholder="Filter rate limit…"
					value={rateLimitFilter}
					onChange={(e) => setRateLimitFilter(e.target.value)}
					className="border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-40"
					aria-label="Filter by rate limit name"
				/>

				{/* Meter filter */}
				<select
					value={meterFilter}
					onChange={(e) => setMeterFilter(e.target.value as MeterFilter)}
					className="border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
					aria-label="Filter by meter"
				>
					<option value="all">All meters</option>
					<option value="requests">Requests</option>
					<option value="tokens">Tokens</option>
					<option value="concurrency">Concurrency</option>
				</select>
			</div>

			{/* Main table */}
			{filteredItems.length === 0 ? (
				<div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
					<p className="text-sm text-gray-500 dark:text-zinc-400">
						{allItems.length === 0
							? 'No attachments configured. Click "Add attachment" to create one.'
							: "No attachments match the current filters."}
					</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-800 mb-8">
					<table className="w-full text-sm">
						<thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
									Parent Kind
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
									Parent Name
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
									Rate Limit
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
									Meter
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
									Created At
								</th>
								<th className="px-4 py-3" />
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
							{filteredItems.map((att) => {
								const dupKey = `${att.parent_kind}|${att.parent_name}|${att.meter}`;
								const isDuplicate = duplicateMeterKeys.has(dupKey);
								const rowClass = isDuplicate
									? "bg-amber-50 dark:bg-amber-950/30"
									: "bg-white dark:bg-zinc-900";
								const dupTooltip = isDuplicate
									? "Duplicate meter: this parent has multiple RateLimits on the same meter; behavior is implementation-defined"
									: undefined;

								return (
									<tr key={att.id} className={rowClass} title={dupTooltip}>
										<td className="px-4 py-3 text-gray-700 dark:text-zinc-300 capitalize">
											{att.parent_kind}
										</td>
										<td className="px-4 py-3">
											{parentLink(att.parent_kind, att.parent_name)}
										</td>
										<td className="px-4 py-3">
											<Link
												to="/ratelimits/$name"
												params={{ name: att.ratelimit_name }}
												className="text-blue-600 hover:underline font-mono text-xs"
											>
												{att.ratelimit_name}
											</Link>
										</td>
										<td className="px-4 py-3 text-gray-700 dark:text-zinc-300">
											{att.meter}
										</td>
										<td className="px-4 py-3 text-gray-500 dark:text-zinc-400 text-xs">
											{new Date(att.created_at).toLocaleString()}
										</td>
										<td className="px-4 py-3 text-right">
											<button
												type="button"
												disabled={deleteAttachment.isPending}
												onClick={() =>
													void handleDetach(att.id, att.ratelimit_name)
												}
												className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
											>
												Detach
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{/* Orphaned Rate Limits section */}
			{orphanedRateLimits.length > 0 && (
				<div>
					<h2 className="text-base font-semibold text-gray-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
						<span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
						Orphaned Rate Limits
						<span className="text-xs font-normal text-gray-500 dark:text-zinc-400">
							— defined but not attached to any resource
						</span>
					</h2>
					<div className="overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-800">
						<table className="w-full text-sm">
							<thead className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
										Rate Limit
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
										Strategy
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
										Window
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
										Amount
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-amber-100 dark:divide-amber-900">
								{orphanedRateLimits.map((rl) => (
									<tr
										key={rl.name}
										className="bg-amber-50 dark:bg-amber-950/30"
										title="Orphaned: no parent uses this RateLimit"
									>
										<td className="px-4 py-3">
											<Link
												to="/ratelimits/$name"
												params={{ name: rl.name }}
												className="text-amber-700 dark:text-amber-400 hover:underline font-mono text-xs"
											>
												{rl.name}
											</Link>
										</td>
										<td className="px-4 py-3 text-amber-800 dark:text-amber-300">
											{rl.strategy}
										</td>
										<td className="px-4 py-3 text-amber-800 dark:text-amber-300">
											{rl.window}
										</td>
										<td className="px-4 py-3 text-amber-800 dark:text-amber-300">
											{rl.amount}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Add Attachment Dialog */}
			{showAddDialog && (
				<Suspense>
					<AddAttachmentDialog onClose={() => setShowAddDialog(false)} />
				</Suspense>
			)}
		</div>
	);
}

function AttachmentsPage() {
	return (
		<Suspense
			fallback={
				<div className="text-gray-500 dark:text-zinc-400 text-sm">Loading…</div>
			}
		>
			<AttachmentsInner />
		</Suspense>
	);
}
