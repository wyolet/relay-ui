import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { policyBindingsAllQueryOptions } from "@/api/hooks/policyBindings";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import {
	teamDetailQueryOptions,
	teamReferencesQueryOptions,
} from "@/api/hooks/teams";
import { PageLoader } from "@/shared/Spinner";
import { TeamDetailView } from "@/teams/TeamDetailView";

export const Route = createFileRoute("/_authenticated/teams/$name")({
	loader: async ({ context, params }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(projectsListQueryOptions);
		void queryClient.prefetchQuery(accountListQueryOptions);
		void queryClient.prefetchQuery(policyBindingsAllQueryOptions);
		void queryClient.prefetchQuery(policiesListQueryOptions);
		const team = await queryClient.ensureQueryData(
			teamDetailQueryOptions(params.name),
		);
		return queryClient.ensureQueryData(
			teamReferencesQueryOptions(team.metadata.id ?? ""),
		);
	},
	component: TeamDetailPage,
});

function TeamDetailPage() {
	const { name } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<TeamDetailView name={name} />
		</Suspense>
	);
}
