import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { usersListQueryOptions } from "@/api/hooks/users";
import { PageLoader } from "@/shared/Spinner";
import { UsersTable } from "@/users/UsersTable";

export const Route = createFileRoute("/_authenticated/users/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(usersListQueryOptions),
	component: UsersPage,
});

function UsersPage() {
	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">Users</h1>
				<p className="mt-0.5 text-xs text-muted-foreground">
					Accounts that can sign in. They come from the bootstrap YAML or your
					identity provider — grant them access with role bindings.
				</p>
			</div>
			<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
				<UsersTable />
			</Suspense>
		</div>
	);
}
