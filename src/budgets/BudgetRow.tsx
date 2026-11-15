import { Link } from "@tanstack/react-router";
import type { Budget } from "@/api/hooks/budgets";
import {
	DEFAULT_MODE,
	DEFAULT_PERIOD,
	MODE_LABELS,
	PERIOD_LABELS,
} from "@/budgets/budgetFormat";
import { displayLabel } from "@/lib/displayLabel";
import { fmtUsd } from "@/lib/limitsFormat";
import { LineColumns, LineName, LineRow, NumberCell } from "@/shared/LineGrid";
import { RowMenu } from "@/shared/RowMenu";

// The tracks' minimums plus gaps come to 33rem, the table's min-w.
const COLS =
	"grid-cols-[minmax(12rem,2fr)_minmax(6rem,1fr)_minmax(5rem,0.8fr)_minmax(5rem,0.8fr)_2rem]";

/** The table's column labels, on the rows' grid. */
export function BudgetColumns() {
	return (
		<LineColumns cols={COLS}>
			<span>Name</span>
			<span className="text-right">Amount</span>
			<span>Period</span>
			<span>Mode</span>
			<span />
		</LineColumns>
	);
}

/** One budget: its cap, the period it resets on, and what happens past it. */
export function BudgetRow({
	budget,
	onDelete,
}: {
	budget: Budget;
	onDelete: () => void;
}) {
	const name = budget.metadata.name;
	return (
		<LineRow cols={COLS}>
			<LineName
				slug={name}
				name={
					<Link
						to="/policies/budgets/$name"
						params={{ name }}
						className="truncate text-foreground hover:underline"
					>
						{displayLabel(budget.metadata)}
					</Link>
				}
			/>
			<NumberCell value={fmtUsd(budget.spec.amountUsd)} />
			<span className="truncate">
				{PERIOD_LABELS[budget.spec.period ?? DEFAULT_PERIOD]}
			</span>
			<span className="truncate">
				{MODE_LABELS[budget.spec.mode ?? DEFAULT_MODE].label}
			</span>
			<span className="flex justify-end">
				<RowMenu
					actions={[
						{
							label: "Edit",
							render: (
								<Link to="/policies/budgets/$name/edit" params={{ name }} />
							),
						},
						{ label: "Delete", danger: true, onClick: onDelete },
					]}
				/>
			</span>
		</LineRow>
	);
}
