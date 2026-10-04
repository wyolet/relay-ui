import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { PageLoader } from "@/shared/Spinner";
import { TeamForm } from "@/teams/TeamForm";

export const Route = createFileRoute("/_authenticated/teams/new")({
	component: NewTeamPage,
});

function NewTeamInner() {
	const navigate = useNavigate();
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/teams"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Teams
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">New team</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Membership is granted afterwards by a role binding at the team's
					scope.
				</p>
			</div>
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
