import { Link, useNavigate } from "@tanstack/react-router";
import { Gauge, Plus } from "lucide-react";
import { useState } from "react";
import {
	useDeleteRateLimit,
	useRateLimits,
	useUpdateRateLimit,
} from "@/api/hooks/ratelimits";
import { ApiError } from "@/api/types/errors";
import type { RateLimit } from "@/api/types/ratelimit";
import { buttonVariants } from "@/components/ui/button";
import { DiagnosticDot } from "@/diagnostics/DiagnosticDot";
import { useRateLimitDiagnostics } from "@/diagnostics/useDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { compactNumber } from "@/lib/rateLimitFormat";
import { windowShort } from "@/lib/timeWindow";
import { confirm } from "@/shared/ConfirmDialog";
import {
	matchesOwnerFilter,
	type OwnerFilter,
	OwnerFilterSelect,
} from "@/shared/OwnerFilter";
import { RowMenu } from "@/shared/RowMenu";
import { SearchBox } from "@/shared/SearchBox";
import { Switch } from "@/shared/Switch";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { toast } from "@/shared/Toast";

export function RateLimitsTable() {
	const { data: rateLimitsData } = useRateLimits();
	const deleteRL = useDeleteRateLimit();
	const navigate = useNavigate({ from: "/policies" });
	const [q, setQ] = useState("");
	const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("user");
	const rawItems = rateLimitsData.items ?? [];
	const allItems = rawItems.filter((rl) =>
		matchesOwnerFilter(rl.metadata.owner, ownerFilter),
	);
	const needle = q.trim().toLowerCase();
	const items = needle
		? allItems.filter((rl) =>
				displayLabel(rl.metadata).toLowerCase().includes(needle),
			)
		: allItems;

	async function handleDelete(rl: RateLimit) {
		const ok = await confirm({
			title: `Delete rate limit ${rl.metadata.name}?`,
			description: "Policies and models that reference it will lose this rule.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteRL.mutateAsync(rl.metadata.id ?? "");
			toast("success", `Rate limit "${displayLabel(rl.metadata)}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof Error ? err.message : "Failed to delete rate limit.",
			);
		}
	}

	return (
		<div>
			<TableToolbar
				search={
					<SearchBox
						value={q}
						onChange={setQ}
						placeholder="Search rate limits"
					/>
				}
				filters={
					<OwnerFilterSelect value={ownerFilter} onChange={setOwnerFilter} />
				}
				actions={
					<Link
						to="/policies/rate-limits/new"
						className={buttonVariants({ variant: "default", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New rate limit
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<Gauge className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{allItems.length === 0 ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No rate limits yet
							</p>
							<p className="text-sm text-muted-foreground mb-5">
								Define a limit and attach it to policies or models.
							</p>
							<Link
								to="/policies/rate-limits/new"
								className={buttonVariants({ variant: "default", size: "lg" })}
							>
								<Plus className="w-4 h-4" />
								Create your first rate limit
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No rate limits match the current filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Name</Th>
								<Th variant="column">Strategy</Th>
								<Th variant="column" align="right">
									Window
								</Th>
								<Th variant="column">Rules</Th>
								<th
									scope="col"
									className="w-12 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
								>
									On
								</th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{items.map((rl) => (
								<RateLimitRow
									key={rl.metadata.name}
									rl={rl}
									onEdit={() =>
										void navigate({
											to: "/policies/rate-limits/$name",
											params: { name: rl.metadata.name },
										})
									}
									onDelete={() => void handleDelete(rl)}
								/>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function RateLimitRow({
	rl,
	onEdit,
	onDelete,
}: {
	rl: RateLimit;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const updateRL = useUpdateRateLimit();
	const diagnostics = useRateLimitDiagnostics(rl.metadata.id);
	const enabled = rl.spec.enabled !== false;
	async function toggleEnabled(next: boolean) {
		try {
			await updateRL.mutateAsync({
				id: rl.metadata.id ?? "",
				body: { metadata: rl.metadata, spec: { ...rl.spec, enabled: next } },
			});
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to update rate limit.",
			);
		}
	}
	return (
		<tr className="border-t border-border hover:bg-muted/40 transition-colors">
			<td className="px-3 py-2">
				<div className="flex items-center gap-2">
					<Link
						to="/policies/rate-limits/$name"
						params={{ name: rl.metadata.name }}
						className="text-sm font-medium text-foreground hover:underline"
					>
						{displayLabel(rl.metadata)}
						{!hasDisplayName(rl.metadata) && (
							<span className="ml-1.5 text-[11px] text-muted-foreground">
								(no display name)
							</span>
						)}
					</Link>
					<DiagnosticDot diagnostics={diagnostics} />
				</div>
			</td>
			<td className="px-3 py-2 text-sm">
				<span className="text-[11px] text-muted-foreground">
					{rl.spec.rules?.[0]?.strategy ?? "—"}
				</span>
			</td>
			<td className="px-3 py-2 text-right text-sm text-foreground tabular-nums">
				{rl.spec.rules?.[0] ? windowShort(rl.spec.rules[0].window) : "—"}
			</td>
			<td className="px-3 py-2 text-sm text-muted-foreground">
				{summarizeRules(rl)}
			</td>
			<td className="px-3 py-2">
				<Switch
					checked={enabled}
					onChange={(next) => void toggleEnabled(next)}
					disabled={updateRL.isPending}
					label={`Toggle ${rl.metadata.name}`}
				/>
			</td>
			<td className="px-3 py-2 text-right">
				<RowMenu
					actions={[
						{ label: "Edit", onClick: onEdit },
						{ label: "Delete", danger: true, onClick: onDelete },
					]}
				/>
			</td>
		</tr>
	);
}

function summarizeRules(rl: RateLimit): string {
	const rules = rl.spec.rules ?? null;
	if (!rules || rules.length === 0) {
		return "—";
	}
	if (rules.length === 1) {
		return `${compactNumber(rules[0].amount)} ${rules[0].meter}`;
	}
	return `${rules.length} rules · ${rules
		.slice(0, 2)
		.map((r) => r.meter)
		.join(", ")}${rules.length > 2 ? "…" : ""}`;
}
