import { Link } from "@tanstack/react-router";
import { Gauge, Plus } from "lucide-react";
import { useState } from "react";
import { useDeleteRateLimit, useRateLimits } from "@/api/hooks/ratelimits";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import { toolbarMainActionClassName } from "@/filters/ToolbarActions";
import type { FilterDef } from "@/filters/types";
import { useOwnerFilter } from "@/hooks/useOwnerFilter";
import { displayLabel } from "@/lib/displayLabel";
import { RateLimitColumns, RateLimitRow } from "@/rate-limits/RateLimitRow";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { LineTable } from "@/shared/LineGrid";
import { OwnerFilter } from "@/shared/OwnerFilter";
import { TableEmpty } from "@/shared/TableEmpty";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

const RATE_LIMIT_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search rate limits",
		placeholder: "Search rate limits",
		default: "",
	},
] as const satisfies readonly FilterDef[];

export function RateLimitsTable() {
	const { data: rateLimitsData } = useRateLimits();
	const del = useConfirmedDelete(useDeleteRateLimit(), { noun: "rate limit" });
	const [q, setQ] = useState("");
	const owner = useOwnerFilter(rateLimitsData.items ?? []);
	const allItems = owner.visible;
	const needle = q.trim().toLowerCase();
	const items = needle
		? allItems.filter((rl) =>
				displayLabel(rl.metadata).toLowerCase().includes(needle),
			)
		: allItems;

	return (
		<div>
			<FilterBar
				defs={RATE_LIMIT_FILTERS}
				state={{ q }}
				onChange={(patch) => {
					if (typeof patch.q === "string") setQ(patch.q);
				}}
				extra={<OwnerFilter filter={owner} />}
				extraActive={owner.isDefault ? 0 : 1}
				className="mb-3"
				actions={
					<Link
						to="/policies/rate-limits/new"
						className={toolbarMainActionClassName}
					>
						<Plus data-icon="inline-start" className="w-3.5 h-3.5" />
						New rate limit
					</Link>
				}
			/>

			{items.length === 0 ? (
				<TableEmpty icon={Gauge}>
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
								<Plus data-icon="inline-start" className="w-4 h-4" />
								Create your first rate limit
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No rate limits match the current filter.
						</p>
					)}
				</TableEmpty>
			) : (
				<LineTable minWidth="min-w-[41.25rem]">
					<RateLimitColumns />
					{items.map((rl) => (
						<RateLimitRow
							key={rl.metadata.name}
							rl={rl}
							onDelete={() =>
								del.request({
									id: rl.metadata.id ?? "",
									name: rl.metadata.name,
									label: displayLabel(rl.metadata),
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
