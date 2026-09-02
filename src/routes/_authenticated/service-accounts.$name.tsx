import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import {
	serviceAccountDetailQueryOptions,
	serviceAccountReferencesQueryOptions,
} from "@/api/hooks/serviceAccounts";
import { ServiceAccountDetailView } from "@/service-accounts/ServiceAccountDetailView";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/service-accounts/$name")({
	loader: async ({ context, params }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(policiesListQueryOptions);
		const sa = await queryClient.ensureQueryData(
			serviceAccountDetailQueryOptions(params.name),
		);
		return Promise.all([
			queryClient.ensureQueryData(projectsListQueryOptions),
			queryClient.ensureQueryData(
				serviceAccountReferencesQueryOptions(sa.metadata.id ?? ""),
			),
		]);
	},
	component: ServiceAccountDetailPage,
});

function ServiceAccountDetailPage() {
	const { name } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<ServiceAccountDetailView name={name} />
		</Suspense>
	);
}
