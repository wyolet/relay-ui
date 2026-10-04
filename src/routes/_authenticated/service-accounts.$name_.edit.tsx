import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import {
	serviceAccountDetailQueryOptions,
	useServiceAccount,
} from "@/api/hooks/serviceAccounts";
import { displayLabel } from "@/lib/displayLabel";
import { ServiceAccountForm } from "@/service-accounts/ServiceAccountForm";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute(
	"/_authenticated/service-accounts/$name_/edit",
)({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				serviceAccountDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(projectsListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
		]),
	component: EditServiceAccountPage,
});

function EditServiceAccountInner() {
	const { name } = Route.useParams();
	const { data: sa } = useServiceAccount(name);
	const navigate = useNavigate();

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/service-accounts/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(sa.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit service account
				</h1>
			</div>
			<ServiceAccountForm
				serviceAccount={sa}
				onSaved={(savedName) =>
					void navigate({
						to: "/service-accounts/$name",
						params: { name: savedName },
					})
				}
				onCancel={() =>
					void navigate({ to: "/service-accounts/$name", params: { name } })
				}
			/>
		</div>
	);
}

function EditServiceAccountPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditServiceAccountInner />
		</Suspense>
	);
}
