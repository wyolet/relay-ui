import { useState } from "react";
import { useBudgets } from "@/api/hooks/budgets";
import { useOwnerFilter } from "@/hooks/useOwnerFilter";
import { displayLabel } from "@/lib/displayLabel";

/** Budgets filtered by owner and the search box. */
export function useBudgetRows() {
	const { data } = useBudgets();
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
	return { rows, total: all.length, q, setQ, owner };
}
