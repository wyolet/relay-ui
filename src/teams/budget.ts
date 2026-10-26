import type { TeamBudget } from "@/api/types/team";

/** One-line budget summary, e.g. "$2,500.00 / month". Null when the
 * scope has no budget: nothing renders rather than a zero cap. */
export function budgetSummary(budget: TeamBudget | undefined): string | null {
	if (!budget?.amount) return null;
	return `$${budget.amount} / ${budget.period ?? "month"}`;
}
