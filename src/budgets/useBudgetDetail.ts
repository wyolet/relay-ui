import { useBudget, useDeleteBudget } from "@/api/hooks/budgets";
import { DEFAULT_MODE, DEFAULT_PERIOD } from "@/budgets/budgetFormat";
import { displayLabel } from "@/lib/displayLabel";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export function useBudgetDetail({
	name,
	onDeleted,
}: {
	name: string;
	onDeleted: () => void;
}) {
	const { data: budget } = useBudget(name);
	const del = useConfirmedDelete(useDeleteBudget(), {
		noun: "budget",
		onDeleted,
	});

	function requestDelete() {
		del.request({
			id: budget.metadata.id ?? "",
			name: budget.metadata.name,
			label: displayLabel(budget.metadata),
		});
	}

	return {
		budget,
		period: budget.spec.period ?? DEFAULT_PERIOD,
		mode: budget.spec.mode ?? DEFAULT_MODE,
		del,
		requestDelete,
	};
}
