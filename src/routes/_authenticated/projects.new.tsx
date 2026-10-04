import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { ProjectForm } from "@/projects/ProjectForm";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	team_id: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/projects/new")({
	validateSearch: searchSchema,
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(teamsListQueryOptions),
	component: NewProjectPage,
});

function NewProjectInner() {
	const { team_id } = Route.useSearch();
	const navigate = useNavigate();
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/projects"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Projects
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					New project
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Everything a project owns — service accounts, keys, policies — is
					attributed to its team's spend.
				</p>
			</div>
			<ProjectForm
				teamId={team_id}
				onSaved={(name) =>
					void navigate({ to: "/projects/$name", params: { name } })
				}
				onCancel={() => void navigate({ to: "/projects" })}
			/>
		</div>
	);
}

function NewProjectPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<NewProjectInner />
		</Suspense>
	);
}
