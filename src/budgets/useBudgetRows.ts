import { useState } from "react";
import { useBudgets } from "@/api/hooks/budgets";
import { displayLabel } from "@/lib/displayLabel";

/** Budgets filtered by the search box. */
export function useBudgetRows() {
	const { data } = useBudgets();
	const [q, setQ] = useState("");
	const all = data.items ?? [];
	const needle = q.trim().toLowerCase();
	const rows = needle
		? all.filter(
				(b) =>
					displayLabel(b.metadata).toLowerCase().includes(needle) ||
					b.metadata.name.includes(needle),
			)
		: all;
	return { rows, total: all.length, q, setQ };
}
