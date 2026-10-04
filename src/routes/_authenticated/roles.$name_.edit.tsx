import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { roleDetailQueryOptions, useRole } from "@/api/hooks/roles";
import { displayLabel } from "@/lib/displayLabel";
import { RoleForm } from "@/roles/RoleForm";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/roles/$name_/edit")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(roleDetailQueryOptions(params.name)),
	component: EditRolePage,
});

function EditRoleInner() {
	const { name } = Route.useParams();
	const { data: role } = useRole(name);
	const navigate = useNavigate();

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/roles/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(role.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit role
				</h1>
			</div>
			<RoleForm
				role={role}
				onSaved={(savedName) =>
					void navigate({ to: "/roles/$name", params: { name: savedName } })
				}
				onCancel={() => void navigate({ to: "/roles/$name", params: { name } })}
			/>
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
