import { Link } from "@tanstack/react-router";
import { Plus, Wallet } from "lucide-react";
import { useDeleteBudget } from "@/api/hooks/budgets";
import { BUDGET_MIN_W, BudgetColumns, BudgetRow } from "@/budgets/BudgetRow";
import { useBudgetRows } from "@/budgets/useBudgetRows";
import { FilterBar } from "@/filters/FilterBar";
import { toolbarMainActionClassName } from "@/filters/ToolbarActions";
import type { FilterDef } from "@/filters/types";
import { displayLabel } from "@/lib/displayLabel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { LineTable } from "@/shared/LineGrid";
import { OwnerFilter } from "@/shared/OwnerFilter";
import { TableEmpty } from "@/shared/TableEmpty";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

const BUDGET_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search budgets",
		placeholder: "Search budgets",
		default: "",
	},
] as const satisfies readonly FilterDef[];

export function BudgetsTable() {
	const { rows, total, q, setQ, owner } = useBudgetRows();
	const del = useConfirmedDelete(useDeleteBudget(), { noun: "budget" });

	return (
		<div>
			<FilterBar
				defs={BUDGET_FILTERS}
				state={{ q }}
				onChange={(patch) => {
					if (typeof patch.q === "string") setQ(patch.q);
				}}
				extra={<OwnerFilter filter={owner} />}
				extraActive={owner.isDefault ? 0 : 1}
				className="mb-3"
				actions={
					<Link
						to="/policies/budgets/new"
						className={toolbarMainActionClassName}
					>
						<Plus data-icon="inline-start" className="w-3.5 h-3.5" />
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
				<LineTable minWidth={BUDGET_MIN_W}>
					<BudgetColumns />
					{rows.map((line) => (
						<BudgetRow
							key={line.budget.metadata.id ?? line.budget.metadata.name}
							line={line}
							onDelete={() =>
								del.request({
									id: line.budget.metadata.id ?? "",
									name: line.budget.metadata.name,
									label: displayLabel(line.budget.metadata),
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
