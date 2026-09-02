import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import {
	roleBindingDetailQueryOptions,
	useRoleBinding,
} from "@/api/hooks/roleBindings";
import { rolesListQueryOptions } from "@/api/hooks/roles";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { displayLabel } from "@/lib/displayLabel";
import { RoleBindingForm } from "@/role-bindings/RoleBindingForm";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute(
	"/_authenticated/role-bindings/$name_/edit",
)({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				roleBindingDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(rolesListQueryOptions),
			context.queryClient.ensureQueryData(teamsListQueryOptions),
			context.queryClient.ensureQueryData(projectsListQueryOptions),
		]),
	component: EditRoleBindingPage,
});

function EditRoleBindingInner() {
	const { name } = Route.useParams();
	const { data: binding } = useRoleBinding(name);
	const navigate = useNavigate();

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/role-bindings/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(binding.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit role binding
				</h1>
			</div>
			<RoleBindingForm
				binding={binding}
				onSaved={(savedName) =>
					void navigate({
						to: "/role-bindings/$name",
						params: { name: savedName },
					})
				}
				onCancel={() =>
					void navigate({ to: "/role-bindings/$name", params: { name } })
				}
			/>
		</div>
	);
}

function EditRoleBindingPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditRoleBindingInner />
		</Suspense>
	);
}
