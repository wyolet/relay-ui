import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { ServiceAccountForm } from "@/service-accounts/ServiceAccountForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/service-accounts/new")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(projectsListQueryOptions),
	component: NewServiceAccountPage,
});

function NewServiceAccountInner() {
	const navigate = useNavigate();
	return (
		<div>
			<PageHeader
				back={<BackLink to="/service-accounts">Service accounts</BackLink>}
				title="New service account"
				description="Keys are issued to an account, so rotating a secret leaves everything bound to the account untouched."
			/>
			<ServiceAccountForm
				onSaved={(name) =>
					void navigate({ to: "/service-accounts/$name", params: { name } })
				}
				onCancel={() => void navigate({ to: "/service-accounts" })}
			/>
		</div>
	);
}

function NewServiceAccountPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<NewServiceAccountInner />
		</Suspense>
	);
}
