import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { budgetDetailQueryOptions, useBudget } from "@/api/hooks/budgets";
import { BudgetForm } from "@/budgets/BudgetForm";
import { displayLabel } from "@/lib/displayLabel";
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
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/policies/budgets/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(budget.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit budget
				</h1>
			</div>
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
