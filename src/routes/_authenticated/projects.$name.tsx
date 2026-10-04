import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import {
	projectDetailQueryOptions,
	projectReferencesQueryOptions,
} from "@/api/hooks/projects";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { ProjectDetailView } from "@/projects/ProjectDetailView";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/projects/$name")({
	loader: async ({ context, params }) => {
		const { queryClient } = context;
		const project = await queryClient.ensureQueryData(
			projectDetailQueryOptions(params.name),
		);
		return Promise.all([
			queryClient.ensureQueryData(teamsListQueryOptions),
			queryClient.ensureQueryData(
				projectReferencesQueryOptions(project.metadata.id ?? ""),
			),
		]);
	},
	component: ProjectDetailPage,
});

function ProjectDetailPage() {
	const { name } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<ProjectDetailView name={name} />
		</Suspense>
	);
}
