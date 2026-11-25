import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { licenseQueryOptions } from "@/api/hooks/license";
import { roleDetailQueryOptions, useRole } from "@/api/hooks/roles";
import { displayLabel } from "@/lib/displayLabel";
import {
	BuiltinRoleNotice,
	CustomRolesNotice,
} from "@/roles/CustomRolesNotice";
import { RoleForm } from "@/roles/RoleForm";
import { useRoleAuthoring } from "@/roles/useRoleAuthoring";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/roles/$name_/edit")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(roleDetailQueryOptions(params.name)),
			context.queryClient.ensureQueryData(licenseQueryOptions),
		]),
	component: EditRolePage,
});

function EditRoleInner() {
	const { name } = Route.useParams();
	const { data: role } = useRole(name);
	const { builtin, editable } = useRoleAuthoring(role);
	const navigate = useNavigate();

	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/roles/$name" params={{ name }}>
						{displayLabel(role.metadata)}
					</BackLink>
				}
				title="Edit role"
			/>
			{editable ? (
				<RoleForm
					role={role}
					onSaved={(savedName) =>
						void navigate({ to: "/roles/$name", params: { name: savedName } })
					}
					onCancel={() =>
						void navigate({ to: "/roles/$name", params: { name } })
					}
				/>
			) : builtin ? (
				<BuiltinRoleNotice />
			) : (
				<CustomRolesNotice />
			)}
		</div>
	);
}

function EditRolePage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditRoleInner />
		</Suspense>
	);
}
