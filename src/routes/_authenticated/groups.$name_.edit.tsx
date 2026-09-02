import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { groupDetailQueryOptions, useGroup } from "@/api/hooks/groups";
import { GroupForm } from "@/groups/GroupForm";
import { displayLabel } from "@/lib/displayLabel";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/groups/$name_/edit")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(groupDetailQueryOptions(params.name)),
	component: EditGroupPage,
});

function EditGroupInner() {
	const { name } = Route.useParams();
	const { data: g } = useGroup(name);
	const navigate = useNavigate();

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/groups/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(g.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit group
				</h1>
			</div>
			<GroupForm
				group={g}
				onSaved={(savedName) =>
					void navigate({ to: "/groups/$name", params: { name: savedName } })
				}
				onCancel={() =>
					void navigate({ to: "/groups/$name", params: { name } })
				}
			/>
		</div>
	);
}

function EditGroupPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditGroupInner />
		</Suspense>
	);
}
