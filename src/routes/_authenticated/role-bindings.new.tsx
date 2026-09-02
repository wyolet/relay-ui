import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { rolesListQueryOptions } from "@/api/hooks/roles";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { RoleBindingForm } from "@/role-bindings/RoleBindingForm";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	scope_kind: z
		.enum(["system", "team", "project"])
		.catch("system")
		.default("system"),
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
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/role-bindings"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Role bindings
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					New role binding
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					The binding applies to every resource whose scope chain contains its
					scope.
				</p>
			</div>
			<RoleBindingForm
				scopeKind={scope_kind}
				scopeId={scope_id}
				onSaved={(name) =>
					void navigate({ to: "/role-bindings/$name", params: { name } })
				}
				onCancel={() => void navigate({ to: "/role-bindings" })}
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
