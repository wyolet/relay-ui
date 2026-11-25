import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { groupDetailQueryOptions, useGroup } from "@/api/hooks/groups";
import { GroupForm } from "@/groups/GroupForm";
import { displayLabel } from "@/lib/displayLabel";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
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
		<div>
			<PageHeader
				back={
					<BackLink to="/groups/$name" params={{ name }}>
						{displayLabel(g.metadata)}
					</BackLink>
				}
				title="Edit group"
			/>
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
