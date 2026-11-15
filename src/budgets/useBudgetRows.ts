import { useState } from "react";
import { type Budget, useBudgets } from "@/api/hooks/budgets";
import { usePolicies } from "@/api/hooks/policies";
import type { Policy } from "@/api/types/policy";
import { useOwnerFilter } from "@/hooks/useOwnerFilter";
import { displayLabel } from "@/lib/displayLabel";

export interface BudgetLine {
	budget: Budget;
	/** The policies that link the budget; none means it caps nothing. */
	usedBy: Policy[];
}

/** Budgets with the policies that use them, filtered by owner and the search box. */
export function useBudgetRows() {
	const { data } = useBudgets();
	const { data: policies } = usePolicies();
	const [q, setQ] = useState("");
	const all = data.items ?? [];
	const owner = useOwnerFilter(all);
	const needle = q.trim().toLowerCase();
	const rows = needle
		? owner.visible.filter(
				(b) =>
					displayLabel(b.metadata).toLowerCase().includes(needle) ||
					b.metadata.name.includes(needle),
			)
		: owner.visible;
	const usedBy = new Map<string, Policy[]>();
	for (const p of policies.items ?? []) {
		for (const link of p.spec.budgets ?? []) {
			usedBy.set(link.budgetId, [...(usedBy.get(link.budgetId) ?? []), p]);
		}
	}
	const lines: BudgetLine[] = rows.map((budget) => ({
		budget,
		usedBy: usedBy.get(budget.metadata.id ?? "") ?? [],
	}));
	return { rows: lines, total: all.length, q, setQ, owner };
}
