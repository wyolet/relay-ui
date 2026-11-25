import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { teamDetailQueryOptions, useTeam } from "@/api/hooks/teams";
import { displayLabel } from "@/lib/displayLabel";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";
import { TeamForm } from "@/teams/TeamForm";

export const Route = createFileRoute("/_authenticated/teams/$name_/edit")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(teamDetailQueryOptions(params.name)),
	component: EditTeamPage,
});

function EditTeamInner() {
	const { name } = Route.useParams();
	const { data: team } = useTeam(name);
	const navigate = useNavigate();

	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/teams/$name" params={{ name }}>
						{displayLabel(team.metadata)}
					</BackLink>
				}
				title="Edit team"
			/>
			<TeamForm
				team={team}
				onSaved={(savedName) =>
					void navigate({ to: "/teams/$name", params: { name: savedName } })
				}
				onCancel={() => void navigate({ to: "/teams/$name", params: { name } })}
			/>
		</div>
	);
}

function EditTeamPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditTeamInner />
		</Suspense>
	);
}
