import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { BudgetForm } from "@/budgets/BudgetForm";

export const Route = createFileRoute("/_authenticated/policies/budgets/new")({
	component: NewBudgetPage,
});

function NewBudgetPage() {
	const navigate = useNavigate();
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/policies"
					search={{ tab: "budgets" }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Budgets
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					New budget
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Define a spend cap. Link it from a policy afterward.
				</p>
			</div>
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
