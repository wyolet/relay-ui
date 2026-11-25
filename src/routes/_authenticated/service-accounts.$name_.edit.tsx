import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import {
	serviceAccountDetailQueryOptions,
	useServiceAccount,
} from "@/api/hooks/serviceAccounts";
import { displayLabel } from "@/lib/displayLabel";
import { ServiceAccountForm } from "@/service-accounts/ServiceAccountForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
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
		]),
	component: EditServiceAccountPage,
});

function EditServiceAccountInner() {
	const { name } = Route.useParams();
	const { data: sa } = useServiceAccount(name);
	const navigate = useNavigate();

	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/service-accounts/$name" params={{ name }}>
						{displayLabel(sa.metadata)}
					</BackLink>
				}
				title="Edit service account"
				description="Change its name or switch it off. The slug and owner stay the same."
			/>
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
