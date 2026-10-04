import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { projectDetailQueryOptions, useProject } from "@/api/hooks/projects";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { displayLabel } from "@/lib/displayLabel";
import { ProjectForm } from "@/projects/ProjectForm";
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
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/projects/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(project.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit project
				</h1>
			</div>
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
