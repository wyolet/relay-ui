import { Link } from "@tanstack/react-router";
import { Layers, Plus } from "lucide-react";
import { useDeletePool } from "@/api/hooks/pools";
import { FilterBar } from "@/filters/FilterBar";
import { toolbarMainActionClassName } from "@/filters/ToolbarActions";
import type { FilterDef } from "@/filters/types";
import { HostCell } from "@/hosts/HostCell";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { poolMemberSummary, SELECTION_LABELS } from "@/pools/poolKeys";
import { usePoolRows } from "@/pools/usePoolRows";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { OwnerFilter } from "@/shared/OwnerFilter";
import { RowMenu } from "@/shared/RowMenu";
import { TableEmpty } from "@/shared/TableEmpty";
import { Th } from "@/shared/Th";
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
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Name</Th>
								<Th variant="column">Host</Th>
								<Th variant="column">Selection</Th>
								<Th variant="column" align="right">
									Members
								</Th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{rows.map(({ pool, host, hostLabel }) => {
								const name = pool.metadata.name;
								return (
									<tr
										key={pool.metadata.id ?? name}
										className="border-t border-border hover:bg-muted/40 transition-colors"
									>
										<td className="px-3 py-2">
											<Link
												to="/pools/$name"
												params={{ name }}
												className="block rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												<div className="text-sm font-medium text-foreground">
													{displayLabel(pool.metadata)}
												</div>
												{hasDisplayName(pool.metadata) && (
													<div className="font-mono text-[11px] text-muted-foreground">
														{name}
													</div>
												)}
											</Link>
										</td>
										<td className="px-3 py-2">
											<HostCell
												host={host}
												fallbackLabel={hostLabel}
												size="sm"
											/>
										</td>
										<td className="px-3 py-2 text-xs text-foreground">
											{
												SELECTION_LABELS[pool.spec.selection ?? "prioritized"]
													.label
											}
										</td>
										<td className="px-3 py-2 text-right text-xs tabular-nums text-foreground">
											{poolMemberSummary(pool)}
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														render: (
															<Link to="/pools/$name/edit" params={{ name }} />
														),
													},
													{
														label: "Delete",
														danger: true,
														onClick: () =>
															del.request({
																id: pool.metadata.id ?? "",
																name,
																label: displayLabel(pool.metadata),
															}),
													},
												]}
											/>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
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
