import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { groupsListQueryOptions } from "@/api/hooks/groups";
import { usersListQueryOptions } from "@/api/hooks/users";
import { PageLoader } from "@/shared/Spinner";
import { UserDetailView } from "@/users/UserDetailView";

export const Route = createFileRoute("/_authenticated/users/$id")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(usersListQueryOptions),
			context.queryClient.ensureQueryData(groupsListQueryOptions),
		]),
	component: UserDetailPage,
});

function UserDetailPage() {
	const { id } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<UserDetailView id={id} />
		</Suspense>
	);
}
