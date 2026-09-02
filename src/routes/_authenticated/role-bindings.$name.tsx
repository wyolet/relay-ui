import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { roleBindingDetailQueryOptions } from "@/api/hooks/roleBindings";
import { rolesListQueryOptions } from "@/api/hooks/roles";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { RoleBindingDetailView } from "@/role-bindings/RoleBindingDetailView";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/role-bindings/$name")({
	loader: ({ context, params }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(teamsListQueryOptions);
		void queryClient.prefetchQuery(projectsListQueryOptions);
		return Promise.all([
			queryClient.ensureQueryData(roleBindingDetailQueryOptions(params.name)),
			queryClient.ensureQueryData(rolesListQueryOptions),
		]);
	},
	component: RoleBindingDetailPage,
});

function RoleBindingDetailPage() {
	const { name } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<RoleBindingDetailView name={name} />
		</Suspense>
	);
}
