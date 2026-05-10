/**
 * Global attachments view — READ-ONLY.
 *
 * Attachments are derived from inline spec.rateLimits[] on Pool/Model
 * resources. This page shows the read-only derived view from GET /admin/attachments.
 * To add/remove rate limits, edit the parent resource directly.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	allAttachmentsQueryOptions,
	useAllAttachments,
} from "@/api/hooks/attachments";
import {
	rateLimitsListQueryOptions,
	useRateLimits,
} from "@/api/hooks/ratelimits";

export const Route = createFileRoute("/_authenticated/attachments")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(allAttachmentsQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
		]),
	component: AttachmentsPage,
});

// ---- Filter state ----

type KindFilter = "all" | "Pool" | "Secret" | "Model";
type MeterFilter = "all" | "requests" | "tokens" | "concurrency";

// ---- Parent-name link helper — links to parent's edit page ----

function parentEditLink(kind: string, name: string) {
	const lowerKind = kind.toLowerCase();
	if (lowerKind === "pool") {
		return (
			<Link
				to="/pools/$name"
				params={{ name }}
				className="text-brand-600 hover:underline font-mono text-xs"
			>
				{name}
			</Link>
		);
	}
	if (lowerKind === "secret") {
		return (
			<Link
				to="/secrets/$name/edit"
				params={{ name }}
				className="text-brand-600 hover:underline font-mono text-xs"
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
			className="text-brand-600 hover:underline font-mono text-xs"
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

	const allItems = attachmentsData.items ?? [];

	// Compute duplicate-meter set: key = `${parentKind}|${parentName}|${meter}`
	const meterGroups = new Map<string, Set<string>>();
	for (const att of allItems) {
		const key = `${att.parentKind}|${att.parentName}|${att.meter}`;
		const existing = meterGroups.get(key);
		if (existing) {
			existing.add(att.ratelimitName);
		} else {
			meterGroups.set(key, new Set([att.ratelimitName]));
		}
	}
	const duplicateMeterKeys = new Set<string>();
	for (const [key, rlNames] of meterGroups) {
		if (rlNames.size > 1) {
			duplicateMeterKeys.add(key);
		}
	}

	// Orphaned rate limits
	const attachedRlNames = new Set(allItems.map((a) => a.ratelimitName));
	const orphanedRateLimits = (rateLimitsData.items ?? []).filter(
		(rl) => !attachedRlNames.has(rl.metadata.name),
	);

	// Apply filters
	const filteredItems = allItems.filter((att) => {
		if (kindFilter !== "all" && att.parentKind !== kindFilter) return false;
		if (
			parentNameFilter &&
			!att.parentName.toLowerCase().includes(parentNameFilter.toLowerCase())
		)
			return false;
		if (
			rateLimitFilter &&
			!att.ratelimitName.toLowerCase().includes(rateLimitFilter.toLowerCase())
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
					<h1 className="text-2xl font-bold text-foreground">Attachments</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Rate limit attachments across all resources.
					</p>
				</div>
			</div>

			{/* Read-only banner */}
			<div className="mb-6 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950 px-4 py-3 text-sm text-brand-700 dark:text-brand-300">
				Attachments are managed inline on Pool/Model resources. This view is
				read-only. To add or remove rate limits, edit the parent resource
				directly — parent name links below go to the edit form.
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-3 mb-6">
				{/* Kind filter */}
				<select
					value={kindFilter}
					onChange={(e) => setKindFilter(e.target.value as KindFilter)}
					className="border border-input rounded-lg px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-brand-400"
					aria-label="Filter by parent kind"
				>
					<option value="all">All kinds</option>
					<option value="Pool">Pool</option>
					<option value="Secret">Secret</option>
					<option value="Model">Model</option>
				</select>

				{/* Parent name filter */}
				<input
					type="search"
					placeholder="Filter parent name…"
					value={parentNameFilter}
					onChange={(e) => setParentNameFilter(e.target.value)}
					className="border border-input rounded-lg px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-40"
					aria-label="Filter by parent name"
				/>

				{/* Rate limit filter */}
				<input
					type="search"
					placeholder="Filter rate limit…"
					value={rateLimitFilter}
					onChange={(e) => setRateLimitFilter(e.target.value)}
					className="border border-input rounded-lg px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-40"
					aria-label="Filter by rate limit name"
				/>

				{/* Meter filter */}
				<select
					value={meterFilter}
					onChange={(e) => setMeterFilter(e.target.value as MeterFilter)}
					className="border border-input rounded-lg px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-brand-400"
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
				<div className="rounded-lg border border-border bg-card p-10 text-center">
					<p className="text-sm text-muted-foreground">
						{allItems.length === 0
							? "No attachments found. Add rate limits on Pool or Model resources."
							: "No attachments match the current filters."}
					</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border mb-8">
					<table className="w-full text-sm">
						<thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Parent Kind
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Parent Name
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Rate Limit
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Meter
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{filteredItems.map((att) => {
								const dupKey = `${att.parentKind}|${att.parentName}|${att.meter}`;
								const isDuplicate = duplicateMeterKeys.has(dupKey);
								const rowClass = isDuplicate
									? "bg-amber-50 dark:bg-amber-950/30"
									: "bg-card";
								const dupTooltip = isDuplicate
									? "Duplicate meter: this parent has multiple RateLimits on the same meter"
									: undefined;

								return (
									<tr key={att.id} className={rowClass} title={dupTooltip}>
										<td className="px-4 py-3 text-foreground capitalize">
											{att.parentKind}
										</td>
										<td className="px-4 py-3">
											{parentEditLink(att.parentKind, att.parentName)}
										</td>
										<td className="px-4 py-3">
											<Link
												to="/ratelimits/$name"
												params={{ name: att.ratelimitName }}
												className="text-brand-600 hover:underline font-mono text-xs"
											>
												{att.ratelimitName}
											</Link>
										</td>
										<td className="px-4 py-3 text-foreground">{att.meter}</td>
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
					<h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
						<span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
						Orphaned Rate Limits
						<span className="text-xs font-normal text-muted-foreground">
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
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<AttachmentsInner />
		</Suspense>
	);
}
