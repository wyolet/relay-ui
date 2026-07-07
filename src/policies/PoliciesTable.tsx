import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useGovernance } from "@/api/hooks/governance";
import {
	useDeletePolicy,
	usePolicies,
	useUpdatePolicy,
} from "@/api/hooks/policies";
import { useAttachableRateLimits } from "@/api/hooks/ratelimits";
import { ApiError } from "@/api/types/errors";
import type { Policy } from "@/api/types/policy";
import type { RateLimit } from "@/api/types/ratelimit";
import { buttonVariants } from "@/components/ui/button";
import { DiagnosticDot } from "@/diagnostics/DiagnosticDot";
import { usePolicyDiagnostics } from "@/diagnostics/useDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { resolveMutability } from "@/lib/ownership";
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

function describeCatalog(p: Policy): {
	label: string;
	tone: "all" | "restricted" | "none";
} {
	const refs = p.spec.models ?? null;
	if (refs === null || refs.length === 0) {
		return { label: "All catalog", tone: "all" };
	}
	return {
		label: `${refs.length} grant${refs.length === 1 ? "" : "s"}`,
		tone: "restricted",
	};
}

export function PoliciesTable() {
	const { data: policiesData } = usePolicies();
	const rateLimits = useAttachableRateLimits();
	const deletePolicy = useDeletePolicy();
	const navigate = useNavigate({ from: "/policies" });
	const [q, setQ] = useState("");
	const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("user");
	const rawItems = policiesData.items ?? [];
	const allItems = rawItems.filter((p) =>
		matchesOwnerFilter(p.metadata.owner, ownerFilter),
	);
	const needle = q.trim().toLowerCase();
	const items = needle
		? allItems.filter((p) =>
				displayLabel(p.metadata).toLowerCase().includes(needle),
			)
		: allItems;

	const rateLimitById = new Map<string, RateLimit>();
	for (const rl of rateLimits) {
		if (rl.metadata.id) rateLimitById.set(rl.metadata.id, rl);
	}

	async function handleDelete(p: Policy) {
		const ok = await confirm({
			title: `Delete policy ${p.metadata.name}?`,
			description:
				"Relay keys using this policy will lose access until reattached.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deletePolicy.mutateAsync(p.metadata.id ?? "");
			toast("success", `Policy "${displayLabel(p.metadata)}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof Error ? err.message : "Failed to delete policy.",
			);
		}
	}

	return (
		<div>
			<TableToolbar
				search={
					<SearchBox value={q} onChange={setQ} placeholder="Search policies" />
				}
				filters={
					<OwnerFilterSelect value={ownerFilter} onChange={setOwnerFilter} />
				}
				actions={
					<Link
						to="/policies/new"
						className={buttonVariants({ variant: "cta", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New policy
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<ShieldCheck className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{allItems.length === 0 ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No policies yet
							</p>
							<p className="text-sm text-muted-foreground mb-5">
								Bundle upstream secrets, allowed models, and rate limits — then
								attach to relay keys.
							</p>
							<Link
								to="/policies/new"
								className={buttonVariants({ variant: "cta", size: "lg" })}
							>
								<Plus className="w-4 h-4" />
								Create your first policy
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No policies match the current filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Name</Th>
								<Th variant="column">Catalog</Th>
								<Th variant="column" align="right">
									Credentials
								</Th>
								<Th variant="column">Rate limit</Th>
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
							{items.map((p) => (
								<PolicyRow
									key={p.metadata.name}
									policy={p}
									rateLimit={
										p.spec.rateLimitId
											? rateLimitById.get(p.spec.rateLimitId)
											: undefined
									}
									onEdit={() =>
										void navigate({
											to: "/policies/$name",
											params: { name: p.metadata.name },
										})
									}
									onDelete={() => void handleDelete(p)}
								/>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function PolicyRow({
	policy,
	rateLimit,
	onEdit,
	onDelete,
}: {
	policy: Policy;
	rateLimit: RateLimit | undefined;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const updatePolicy = useUpdatePolicy();
	const diagnostics = usePolicyDiagnostics(policy.metadata.id);
	const catalog = describeCatalog(policy);
	const enabled = policy.spec.enabled !== false;
	const gov = useGovernance("policy");
	const { canEdit, canDelete } = resolveMutability(
		policy.metadata.owner?.kind,
		gov,
	);

	async function toggleEnabled(next: boolean) {
		try {
			await updatePolicy.mutateAsync({
				id: policy.metadata.id ?? "",
				body: {
					metadata: policy.metadata,
					spec: { ...policy.spec, enabled: next },
				},
			});
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to update policy.",
			);
		}
	}

	return (
		<tr className="border-t border-border hover:bg-muted/40 transition-colors">
			<td className="px-3 py-2">
				<Link
					to="/policies/$name"
					params={{ name: policy.metadata.name }}
					className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
				>
					<div className="flex items-center gap-2 text-sm font-medium text-foreground">
						<span>{displayLabel(policy.metadata)}</span>
						{!hasDisplayName(policy.metadata) && (
							<span className="text-[11px] text-muted-foreground">
								(no display name)
							</span>
						)}
						<DiagnosticDot diagnostics={diagnostics} />
					</div>
					{hasDisplayName(policy.metadata) && (
						<code className="font-mono text-[11px] text-muted-foreground">
							{policy.metadata.name}
						</code>
					)}
				</Link>
			</td>
			<td className="px-3 py-2">
				<span
					className={[
						"inline-flex items-center h-5 px-1.5 rounded text-[11px] font-medium",
						catalog.tone === "all"
							? "bg-muted text-muted-foreground"
							: "bg-primary/10 text-primary",
					].join(" ")}
				>
					{catalog.label}
				</span>
			</td>
			<td className="px-3 py-2 text-sm text-foreground text-right tabular-nums">
				{(policy.spec.hostKeyIds ?? []).length}
			</td>
			<td className="px-3 py-2 text-sm">
				{rateLimit ? (
					<Link
						to="/policies/rate-limits/$name"
						params={{ name: rateLimit.metadata.name }}
						className="text-foreground hover:underline"
					>
						{displayLabel(rateLimit.metadata)}
					</Link>
				) : (policy.spec.rlBindings ?? []).length > 0 ? (
					<span className="text-muted-foreground">
						{(policy.spec.rlBindings ?? []).length} rate limits
					</span>
				) : (
					<span className="text-muted-foreground/70">—</span>
				)}
			</td>
			<td className="px-3 py-2">
				{canEdit ? (
					<Switch
						checked={enabled}
						onChange={(next) => void toggleEnabled(next)}
						disabled={updatePolicy.isPending}
						label={`Toggle ${policy.metadata.name}`}
					/>
				) : (
					<span
						className={[
							"inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
							enabled
								? "bg-success-soft text-success border-success/30"
								: "bg-muted text-muted-foreground border-border",
						].join(" ")}
						title="Host-owned — toggle the host or model instead"
					>
						{enabled ? "On" : "Off"}
					</span>
				)}
			</td>
			<td className="px-3 py-2 text-right">
				{canEdit || canDelete ? (
					<RowMenu
						actions={[
							...(canEdit ? [{ label: "Edit", onClick: onEdit }] : []),
							...(canDelete
								? [{ label: "Delete", danger: true, onClick: onDelete }]
								: []),
						]}
					/>
				) : (
					<span
						className="text-[10px] uppercase tracking-wide text-muted-foreground"
						title="Host-owned — managed by Relay"
					>
						managed
					</span>
				)}
			</td>
		</tr>
	);
}
