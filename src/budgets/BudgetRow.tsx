import { Link } from "@tanstack/react-router";
import { capText, DEFAULT_MODE, MODE_LABELS } from "@/budgets/budgetFormat";
import type { BudgetLine } from "@/budgets/useBudgetRows";
import { displayLabel } from "@/lib/displayLabel";
import { fmtUsd } from "@/lib/limitsFormat";
import { OwnerLink } from "@/projects/OwnerLink";
import { LineColumns, LineName, LineRow } from "@/shared/LineGrid";
import { RowMenu } from "@/shared/RowMenu";

// The tracks' minimums plus gaps come to 41rem, the table's min-w.
const COLS =
	"grid-cols-[minmax(12rem,2fr)_minmax(8rem,1fr)_minmax(10rem,1.4fr)_minmax(4rem,0.6fr)_2rem]";
export const BUDGET_MIN_W = "min-w-[41rem]";

/** The table's column labels, on the rows' grid. */
export function BudgetColumns() {
	return (
		<LineColumns cols={COLS}>
			<span>Name</span>
			<span>Cap</span>
			<span>Used by</span>
			<span>Mode</span>
			<span />
		</LineColumns>
	);
}

/** One budget: its cap, the policies it caps, and what happens past it. */
export function BudgetRow({
	line,
	onDelete,
}: {
	line: BudgetLine;
	onDelete: () => void;
}) {
	const { budget, usedBy } = line;
	const name = budget.metadata.name;
	const mode = MODE_LABELS[budget.spec.mode ?? DEFAULT_MODE];
	const [onlyPolicy] = usedBy;
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
			>
				<span className="shrink-0 empty:hidden">
					<OwnerLink owner={budget.metadata.owner} />
				</span>
			</LineName>
			<span className="truncate tabular-nums">
				{capText(budget.spec, fmtUsd)}
			</span>
			<span className="min-w-0 truncate">
				{usedBy.length === 1 && onlyPolicy ? (
					<Link
						to="/policies/$name"
						params={{ name: onlyPolicy.metadata.name }}
						className="text-foreground hover:underline"
					>
						{displayLabel(onlyPolicy.metadata)}
					</Link>
				) : usedBy.length > 1 ? (
					`${usedBy.length} policies`
				) : (
					<span
						className="text-warning"
						title="No policy links this budget, so it caps nothing."
					>
						Not used
					</span>
				)}
			</span>
			<span className="truncate" title={mode.hint}>
				{mode.label}
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
