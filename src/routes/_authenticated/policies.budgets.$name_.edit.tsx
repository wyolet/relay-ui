import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { budgetDetailQueryOptions, useBudget } from "@/api/hooks/budgets";
import { BudgetForm } from "@/budgets/BudgetForm";
import { displayLabel } from "@/lib/displayLabel";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute(
	"/_authenticated/policies/budgets/$name_/edit",
)({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(budgetDetailQueryOptions(params.name)),
	component: EditBudgetPage,
});

function EditBudgetInner() {
	const { name } = Route.useParams();
	const { data: budget } = useBudget(name);
	const navigate = useNavigate();
	const back = () =>
		void navigate({ to: "/policies/budgets/$name", params: { name } });

	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/policies/budgets/$name" params={{ name }}>
						{displayLabel(budget.metadata)}
					</BackLink>
				}
				title="Edit budget"
			/>
			<BudgetForm
				budget={budget}
				onSaved={(savedName) =>
					void navigate({
						to: "/policies/budgets/$name",
						params: { name: savedName },
					})
				}
				onCancel={back}
			/>
		</div>
	);
}

function EditBudgetPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditBudgetInner />
		</Suspense>
	);
}
