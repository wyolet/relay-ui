import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { ProjectForm } from "@/projects/ProjectForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
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
		<div>
			<PageHeader
				back={<BackLink to="/projects">Projects</BackLink>}
				title="New project"
				description="Everything a project owns — service accounts, keys, policies — is attributed to its team's spend."
			/>
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
