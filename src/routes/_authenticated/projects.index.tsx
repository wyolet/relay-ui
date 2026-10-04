import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { projectsListQuery } from "@/api/hooks/projects";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { ProjectsTable, toProjectsParams } from "@/projects/ProjectsTable";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	q: z.string().default(""),
	enabled: z.enum(["all", "true", "false"]).catch("all").default("all"),
	team_id: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/projects/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({
		q: search.q,
		enabled: search.enabled,
		team_id: search.team_id,
	}),
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				projectsListQuery(toProjectsParams(deps)),
			),
			context.queryClient.ensureQueryData(teamsListQueryOptions),
		]),
	component: ProjectsPage,
});

function ProjectsPage() {
	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">Projects</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					A project lives in a team and owns the service accounts, keys, and
					policies that author requests.
				</p>
			</div>
			<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
				<ProjectsTable />
			</Suspense>
		</div>
	);
}
