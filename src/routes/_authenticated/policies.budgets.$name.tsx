import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { budgetDetailQueryOptions } from "@/api/hooks/budgets";
import { BudgetDetailView } from "@/budgets/BudgetDetailView";
import { BudgetCovers } from "@/policies/BudgetCovers";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/policies/budgets/$name")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(budgetDetailQueryOptions(params.name)),
	component: BudgetDetailPage,
});

function BudgetDetailPage() {
	const { name } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<BudgetDetailView name={name}>
				<BudgetCovers budgetName={name} />
			</BudgetDetailView>
		</Suspense>
	);
}
