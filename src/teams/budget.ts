import type { TeamBudget } from "@/api/types/team";

/** One-line budget summary, e.g. "$2,500.00 / month · block". Null when the
 * scope has no budget: nothing renders rather than a zero cap. */
export function budgetSummary(budget: TeamBudget | undefined): string | null {
	if (!budget?.amount) return null;
	const period = budget.period ?? "month";
	const onExceed = budget.onExceed ?? "block";
	return `$${budget.amount} / ${period} · ${onExceed}`;
}
