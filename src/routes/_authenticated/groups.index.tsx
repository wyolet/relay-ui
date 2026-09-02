import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { groupsListQuery } from "@/api/hooks/groups";
import { GroupsTable, toGroupsParams } from "@/groups/GroupsTable";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	q: z.string().default(""),
	enabled: z.enum(["all", "true", "false"]).catch("all").default("all"),
});

export const Route = createFileRoute("/_authenticated/groups/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ q: search.q, enabled: search.enabled }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(groupsListQuery(toGroupsParams(deps))),
	component: GroupsPage,
});

function GroupsPage() {
	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">Groups</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					Named sets of users that bindings can name as a subject.
				</p>
			</div>
			<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
				<GroupsTable />
			</Suspense>
		</div>
	);
}
