import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";
import { TeamForm } from "@/teams/TeamForm";

export const Route = createFileRoute("/_authenticated/teams/new")({
	component: NewTeamPage,
});

function NewTeamInner() {
	const navigate = useNavigate();
	return (
		<div>
			<PageHeader
				back={<BackLink to="/teams">Teams</BackLink>}
				title="New team"
				description="Membership is granted afterwards by a role binding at the team's scope."
			/>
			<TeamForm
				onSaved={(name) =>
					void navigate({ to: "/teams/$name", params: { name } })
				}
				onCancel={() => void navigate({ to: "/teams" })}
			/>
		</div>
	);
}

function NewTeamPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<NewTeamInner />
		</Suspense>
	);
}
