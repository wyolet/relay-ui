import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { roleBindingsListQuery } from "@/api/hooks/roleBindings";
import { rolesListQueryOptions } from "@/api/hooks/roles";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import {
	RoleBindingsTable,
	toRoleBindingsParams,
} from "@/role-bindings/RoleBindingsTable";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	q: z.string().default(""),
	role_id: z.string().catch("").default(""),
	scope_kind: z
		.enum(["all", "system", "team", "project"])
		.catch("all")
		.default("all"),
	scope_id: z.string().catch("").default(""),
	subject: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/role-bindings/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ ...search }),
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				roleBindingsListQuery(toRoleBindingsParams(deps)),
			),
			context.queryClient.ensureQueryData(rolesListQueryOptions),
			context.queryClient.ensureQueryData(teamsListQueryOptions),
			context.queryClient.ensureQueryData(projectsListQueryOptions),
		]),
	component: RoleBindingsPage,
});

function RoleBindingsPage() {
	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">Role bindings</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					Grants one role to a set of subjects at one scope — global, a team, or
					a project.
				</p>
			</div>
			<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
				<RoleBindingsTable />
			</Suspense>
		</div>
	);
}
