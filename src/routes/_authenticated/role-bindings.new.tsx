import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { rolesListQueryOptions } from "@/api/hooks/roles";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { RoleBindingForm } from "@/role-bindings/RoleBindingForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	scope_kind: z
		.enum(["organization", "team", "project"])
		.catch("organization")
		.default("organization"),
	scope_id: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/role-bindings/new")({
	validateSearch: searchSchema,
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(rolesListQueryOptions),
			context.queryClient.ensureQueryData(teamsListQueryOptions),
			context.queryClient.ensureQueryData(projectsListQueryOptions),
		]),
	component: NewRoleBindingPage,
});

function NewRoleBindingInner() {
	const { scope_kind, scope_id } = Route.useSearch();
	const navigate = useNavigate();
	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/users" search={{ tab: "role-bindings" }}>
						Role bindings
					</BackLink>
				}
				title="New role binding"
				description="The binding applies to every resource whose scope chain contains its scope."
			/>
			<RoleBindingForm
				scopeKind={scope_kind}
				scopeId={scope_id}
				onSaved={(name) =>
					void navigate({ to: "/role-bindings/$name", params: { name } })
				}
				onCancel={() =>
					void navigate({ to: "/users", search: { tab: "role-bindings" } })
				}
			/>
		</div>
	);
}

function NewRoleBindingPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<NewRoleBindingInner />
		</Suspense>
	);
}
