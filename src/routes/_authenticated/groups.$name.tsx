import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { groupDetailQueryOptions } from "@/api/hooks/groups";
import { GroupDetailView } from "@/groups/GroupDetailView";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/groups/$name")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(groupDetailQueryOptions(params.name)),
	component: GroupDetailPage,
});

function GroupDetailPage() {
	const { name } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<GroupDetailView name={name} />
		</Suspense>
	);
}
