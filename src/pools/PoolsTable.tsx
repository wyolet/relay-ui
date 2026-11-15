import { Link } from "@tanstack/react-router";
import { Layers, Plus } from "lucide-react";
import { useDeletePool } from "@/api/hooks/pools";
import { FilterBar } from "@/filters/FilterBar";
import { toolbarMainActionClassName } from "@/filters/ToolbarActions";
import type { FilterDef } from "@/filters/types";
import { displayLabel } from "@/lib/displayLabel";
import { PoolColumns, PoolRow } from "@/pools/PoolRow";
import { usePoolRows } from "@/pools/usePoolRows";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { LineTable } from "@/shared/LineGrid";
import { OwnerFilter } from "@/shared/OwnerFilter";
import { TableEmpty } from "@/shared/TableEmpty";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

const POOL_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search pools",
		placeholder: "Search pools",
		default: "",
	},
] as const satisfies readonly FilterDef[];

export function PoolsTable() {
	const { rows, total, q, setQ, owner } = usePoolRows();
	const del = useConfirmedDelete(useDeletePool(), { noun: "pool" });

	return (
		<div>
			<FilterBar
				defs={POOL_FILTERS}
				state={{ q }}
				onChange={(patch) => {
					if (typeof patch.q === "string") setQ(patch.q);
				}}
				extra={<OwnerFilter filter={owner} />}
				extraActive={owner.isDefault ? 0 : 1}
				className="mb-3"
				actions={
					<Link to="/pools/new" className={toolbarMainActionClassName}>
						<Plus data-icon="inline-start" className="w-3.5 h-3.5" />
						New pool
					</Link>
				}
			/>

			{rows.length === 0 ? (
				<TableEmpty icon={Layers}>
					<p className="text-sm text-muted-foreground">
						{total === 0
							? "No pools yet. A pool orders credentials at one host for a policy to route through."
							: "No pools match the current filter."}
					</p>
				</TableEmpty>
			) : (
				<LineTable minWidth="min-w-[49rem]">
					<PoolColumns />
					{rows.map((line) => (
						<PoolRow
							key={line.pool.metadata.id ?? line.pool.metadata.name}
							line={line}
							onDelete={() =>
								del.request({
									id: line.pool.metadata.id ?? "",
									name: line.pool.metadata.name,
									label: displayLabel(line.pool.metadata),
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
