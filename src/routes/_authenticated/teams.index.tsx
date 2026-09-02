import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { teamsListQuery } from "@/api/hooks/teams";
import { PageLoader } from "@/shared/Spinner";
import { TeamsTable, toTeamsParams } from "@/teams/TeamsTable";

const searchSchema = z.object({
	q: z.string().default(""),
	enabled: z.enum(["all", "true", "false"]).catch("all").default("all"),
});

export const Route = createFileRoute("/_authenticated/teams/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ q: search.q, enabled: search.enabled }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(teamsListQuery(toTeamsParams(deps))),
	component: TeamsPage,
});

function TeamsPage() {
	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">Teams</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					The outer tenancy scope. A team owns projects and their spend.
				</p>
			</div>
			<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
				<TeamsTable />
			</Suspense>
		</div>
	);
}
