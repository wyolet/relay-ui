import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { policyBindingDetailQueryOptions } from "@/api/hooks/policyBindings";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { PolicyBindingDetailView } from "@/policy-bindings/PolicyBindingDetailView";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/policy-bindings/$name")({
	loader: ({ context, params }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(projectsListQueryOptions);
		void queryClient.prefetchQuery(accountListQueryOptions);
		return Promise.all([
			queryClient.ensureQueryData(policyBindingDetailQueryOptions(params.name)),
			queryClient.ensureQueryData(policiesListQueryOptions),
		]);
	},
	component: PolicyBindingDetailPage,
});

function PolicyBindingDetailPage() {
	const { name } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<PolicyBindingDetailView name={name} />
		</Suspense>
	);
}
