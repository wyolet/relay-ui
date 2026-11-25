import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
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
		<div>
			<PageHeader
				back={
					<BackLink to="/role-bindings/$name" params={{ name }}>
						{displayLabel(binding.metadata)}
					</BackLink>
				}
				title="Edit role binding"
			/>
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
