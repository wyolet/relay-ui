import { Link } from "@tanstack/react-router";
import { Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useDeletePolicy, usePolicies } from "@/api/hooks/policies";
import { useAttachableRateLimits } from "@/api/hooks/ratelimits";
import type { RateLimit } from "@/api/types/ratelimit";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import { toolbarMainActionClassName } from "@/filters/ToolbarActions";
import type { FilterDef } from "@/filters/types";
import { useOwnerFilter } from "@/hooks/useOwnerFilter";
import { displayLabel } from "@/lib/displayLabel";
import { POLICY_MIN_W, PolicyColumns, PolicyRow } from "@/policies/PolicyRow";
import { usePolicyAppliesToCounts } from "@/policies/usePolicyAppliesTo";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { LineTable } from "@/shared/LineGrid";
import { OwnerFilter } from "@/shared/OwnerFilter";
import { TableEmpty } from "@/shared/TableEmpty";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

const POLICY_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search policies",
		placeholder: "Search policies",
		default: "",
	},
] as const satisfies readonly FilterDef[];

export function PoliciesTable() {
	const { data: policiesData } = usePolicies();
	const rateLimits = useAttachableRateLimits();
	const appliesToCounts = usePolicyAppliesToCounts();
	const del = useConfirmedDelete(useDeletePolicy(), { noun: "policy" });
	const [q, setQ] = useState("");
	const owner = useOwnerFilter(policiesData.items ?? []);
	const allItems = owner.visible;
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

	return (
		<div>
			<FilterBar
				defs={POLICY_FILTERS}
				state={{ q }}
				onChange={(patch) => {
					if (typeof patch.q === "string") setQ(patch.q);
				}}
				extra={<OwnerFilter filter={owner} />}
				extraActive={owner.isDefault ? 0 : 1}
				className="mb-3"
				actions={
					<Link to="/policies/new" className={toolbarMainActionClassName}>
						<Plus data-icon="inline-start" className="w-3.5 h-3.5" />
						New policy
					</Link>
				}
			/>

			{items.length === 0 ? (
				<TableEmpty icon={ShieldCheck}>
					{allItems.length === 0 ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No policies yet
							</p>
							<p className="text-sm text-muted-foreground mb-5">
								Bundle pools, allowed models, rate limits and budgets — then
								bind the policy where it applies.
							</p>
							<Link
								to="/policies/new"
								className={buttonVariants({ variant: "default", size: "lg" })}
							>
								<Plus data-icon="inline-start" className="w-4 h-4" />
								Create your first policy
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No policies match the current filter.
						</p>
					)}
				</TableEmpty>
			) : (
				<LineTable minWidth={POLICY_MIN_W}>
					<PolicyColumns />
					{items.map((p) => (
						<PolicyRow
							key={p.metadata.id ?? p.metadata.name}
							policy={p}
							rateLimitById={rateLimitById}
							appliesTo={
								appliesToCounts
									? (appliesToCounts.get(p.metadata.id ?? "") ?? 0)
									: undefined
							}
							onDelete={() =>
								del.request({
									id: p.metadata.id ?? "",
									name: p.metadata.name,
									label: displayLabel(p.metadata),
								})
							}
						/>
					))}
				</LineTable>
			)}
			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
			)}
		</div>
	);
}
