import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BudgetForm } from "@/budgets/BudgetForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";

export const Route = createFileRoute("/_authenticated/policies/budgets/new")({
	component: NewBudgetPage,
});

function NewBudgetPage() {
	const navigate = useNavigate();
	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/policies" search={{ tab: "budgets" }}>
						Budgets
					</BackLink>
				}
				title="New budget"
				description="Define a spend cap. Link it from a policy afterward."
			/>
			<BudgetForm
				onSaved={(name) =>
					void navigate({ to: "/policies/budgets/$name", params: { name } })
				}
				onCancel={() =>
					void navigate({ to: "/policies", search: { tab: "budgets" } })
				}
			/>
		</div>
	);
}
