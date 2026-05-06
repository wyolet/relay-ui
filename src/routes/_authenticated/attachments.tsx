/**
 * Global attachments view — READ-ONLY (PER-279 updated).
 *
 * Attachments are now derived from inline spec.rateLimits[] on Pool/Secret/Model
 * resources. This page shows the read-only derived view from GET /admin/attachments.
 * To add/remove rate limits, edit the parent resource directly.
 *
 * Design decisions:
 * - Banner at top explains the read-only nature and how to manage rate limits.
 * - Orphaned RateLimits: rendered in a separate "Orphaned Rate Limits" section.
 * - Duplicate-meter rows: detected client-side, highlighted amber.
 * - Parent name cells link to the parent's edit page for quick navigation.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	allAttachmentsQueryOptions,
	useAllAttachments,
} from "#/api/hooks/attachments";
import {
	rateLimitsListQueryOptions,
	useRateLimits,
} from "#/api/hooks/ratelimits";
import type {
	AttachmentMeter,
	AttachmentParentKind,
} from "#/api/types/attachment";

export const Route = createFileRoute("/_authenticated/attachments")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(allAttachmentsQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
		]),
	component: AttachmentsPage,
});

// ---- Filter state ----

type KindFilter = "all" | AttachmentParentKind;
type MeterFilter = "all" | AttachmentMeter;

// ---- Parent-name link helper — links to parent's edit page ----

function parentEditLink(kind: AttachmentParentKind, name: string) {
	if (kind === "pool") {
		return (
			<Link
				to="/pools/$name/edit"
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
				to="/secrets/$name/edit"
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
			to="/models/$name/edit"
			params={{ name }}
			className="text-blue-600 hover:underline font-mono text-xs"
		>
			{name}
		</Link>
	);
}

// ---- Main inner component (inside Suspense) ----

function AttachmentsInner() {
	const { data: attachmentsData } = useAllAttachments();
	const { data: rateLimitsData } = useRateLimits();

	// Filters
	const [kindFilter, setKindFilter] = useState<KindFilter>("all");
	const [parentNameFilter, setParentNameFilter] = useState("");
	const [rateLimitFilter, setRateLimitFilter] = useState("");
	const [meterFilter, setMeterFilter] = useState<MeterFilter>("all");

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
		(rl) => !attachedRlNames.has(rl.metadata.name),
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

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
						Attachments
					</h1>
					<p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
						Rate limit attachments across all resources.
					</p>
				</div>
			</div>

			{/* Read-only banner */}
			<div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
				Attachments are managed inline on Pool/Secret/Model resources. This view
				is read-only. To add or remove rate limits, edit the parent resource
				directly — parent name links below go to the edit form.
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
							? "No attachments found. Add rate limits on Pool, Secret, or Model resources."
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
											{parentEditLink(att.parent_kind, att.parent_name)}
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
										key={rl.metadata.name}
										className="bg-amber-50 dark:bg-amber-950/30"
										title="Orphaned: no parent uses this RateLimit"
									>
										<td className="px-4 py-3">
											<Link
												to="/ratelimits/$name"
												params={{ name: rl.metadata.name }}
												className="text-amber-700 dark:text-amber-400 hover:underline font-mono text-xs"
											>
												{rl.metadata.name}
											</Link>
										</td>
										<td className="px-4 py-3 text-amber-800 dark:text-amber-300">
											{rl.spec.strategy}
										</td>
										<td className="px-4 py-3 text-amber-800 dark:text-amber-300">
											{rl.spec.window}
										</td>
										<td className="px-4 py-3 text-amber-800 dark:text-amber-300">
											{rl.spec.amount}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
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
