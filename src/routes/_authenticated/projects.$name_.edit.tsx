import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { projectDetailQueryOptions, useProject } from "@/api/hooks/projects";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { displayLabel } from "@/lib/displayLabel";
import { ProjectForm } from "@/projects/ProjectForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/projects/$name_/edit")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				projectDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(teamsListQueryOptions),
		]),
	component: EditProjectPage,
});

function EditProjectInner() {
	const { name } = Route.useParams();
	const { data: project } = useProject(name);
	const navigate = useNavigate();

	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/projects/$name" params={{ name }}>
						{displayLabel(project.metadata)}
					</BackLink>
				}
				title="Edit project"
			/>
			<ProjectForm
				project={project}
				onSaved={(savedName) =>
					void navigate({ to: "/projects/$name", params: { name: savedName } })
				}
				onCancel={() =>
					void navigate({ to: "/projects/$name", params: { name } })
				}
			/>
		</div>
	);
}

function EditProjectPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditProjectInner />
		</Suspense>
	);
}
