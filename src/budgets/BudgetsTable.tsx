import { Link } from "@tanstack/react-router";
import { Plus, Wallet } from "lucide-react";
import { useDeleteBudget } from "@/api/hooks/budgets";
import {
	DEFAULT_MODE,
	DEFAULT_PERIOD,
	MODE_LABELS,
	PERIOD_LABELS,
} from "@/budgets/budgetFormat";
import { useBudgetRows } from "@/budgets/useBudgetRows";
import { buttonVariants } from "@/components/ui/button";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { fmtUsd } from "@/lib/limitsFormat";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { RowMenu } from "@/shared/RowMenu";
import { SearchBox } from "@/shared/SearchBox";
import { TableEmpty } from "@/shared/TableEmpty";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export function BudgetsTable() {
	const { rows, total, q, setQ } = useBudgetRows();
	const del = useConfirmedDelete(useDeleteBudget(), { noun: "budget" });

	return (
		<div>
			<TableToolbar
				search={
					<SearchBox value={q} onChange={setQ} placeholder="Search budgets" />
				}
				actions={
					<Link
						to="/policies/budgets/new"
						className={buttonVariants({ variant: "default", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New budget
					</Link>
				}
			/>

			{rows.length === 0 ? (
				<TableEmpty icon={Wallet}>
					<p className="text-sm text-muted-foreground">
						{total === 0
							? "No budgets yet. Define a spend cap and link it from a policy."
							: "No budgets match the current filter."}
					</p>
				</TableEmpty>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Name</Th>
								<Th variant="column" align="right">
									Amount
								</Th>
								<Th variant="column">Period</Th>
								<Th variant="column">Mode</Th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{rows.map((b) => {
								const name = b.metadata.name;
								return (
									<tr
										key={b.metadata.id ?? name}
										className="border-t border-border hover:bg-muted/40 transition-colors"
									>
										<td className="px-3 py-2">
											<Link
												to="/policies/budgets/$name"
												params={{ name }}
												className="block rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												<div className="text-sm font-medium text-foreground">
													{displayLabel(b.metadata)}
												</div>
												{hasDisplayName(b.metadata) && (
													<div className="font-mono text-[11px] text-muted-foreground">
														{name}
													</div>
												)}
											</Link>
										</td>
										<td className="px-3 py-2 text-right text-sm tabular-nums text-foreground">
											{fmtUsd(b.spec.amountUsd)}
										</td>
										<td className="px-3 py-2 text-xs text-foreground">
											{PERIOD_LABELS[b.spec.period ?? DEFAULT_PERIOD]}
										</td>
										<td className="px-3 py-2 text-xs text-foreground">
											{MODE_LABELS[b.spec.mode ?? DEFAULT_MODE].label}
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														render: (
															<Link
																to="/policies/budgets/$name/edit"
																params={{ name }}
															/>
														),
													},
													{
														label: "Delete",
														danger: true,
														onClick: () =>
															del.request({
																id: b.metadata.id ?? "",
																name,
																label: displayLabel(b.metadata),
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
