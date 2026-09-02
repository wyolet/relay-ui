import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import {
	FEATURE_CUSTOM_ROLES,
	licenseQueryOptions,
	useHasLicenseFeature,
} from "@/api/hooks/license";
import { CustomRolesNotice } from "@/roles/CustomRolesNotice";
import { RoleForm } from "@/roles/RoleForm";
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
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/roles"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Roles
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">New role</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Bind it afterwards to grant it at a scope.
				</p>
			</div>
			{canAuthor ? (
				<RoleForm
					onSaved={(name) =>
						void navigate({ to: "/roles/$name", params: { name } })
					}
					onCancel={() => void navigate({ to: "/roles" })}
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
