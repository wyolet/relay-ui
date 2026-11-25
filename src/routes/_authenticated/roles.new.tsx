import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import {
	FEATURE_CUSTOM_ROLES,
	licenseQueryOptions,
	useHasLicenseFeature,
} from "@/api/hooks/license";
import { CustomRolesNotice } from "@/roles/CustomRolesNotice";
import { RoleForm } from "@/roles/RoleForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/roles/new")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(licenseQueryOptions),
	component: NewRolePage,
});

function NewRoleInner() {
	const navigate = useNavigate();
	const canAuthor = useHasLicenseFeature(FEATURE_CUSTOM_ROLES);
	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/users" search={{ tab: "roles" }}>
						Roles
					</BackLink>
				}
				title="New role"
				description="Bind it afterwards to grant it at a scope."
			/>
			{canAuthor ? (
				<RoleForm
					onSaved={(name) =>
						void navigate({ to: "/roles/$name", params: { name } })
					}
					onCancel={() =>
						void navigate({ to: "/users", search: { tab: "roles" } })
					}
				/>
			) : (
				<CustomRolesNotice />
			)}
		</div>
	);
}

function NewRolePage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<NewRoleInner />
		</Suspense>
	);
}
