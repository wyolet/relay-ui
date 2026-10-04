import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { teamDetailQueryOptions, useTeam } from "@/api/hooks/teams";
import { displayLabel } from "@/lib/displayLabel";
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
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/teams/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(team.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit team
				</h1>
			</div>
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
