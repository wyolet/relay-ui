import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import {
	policyBindingDetailQueryOptions,
	usePolicyBinding,
} from "@/api/hooks/policyBindings";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { displayLabel } from "@/lib/displayLabel";
import { PolicyBindingForm } from "@/policy-bindings/PolicyBindingForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute(
	"/_authenticated/policy-bindings/$name_/edit",
)({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				policyBindingDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(projectsListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(accountListQueryOptions),
		]),
	component: EditPolicyBindingPage,
});

function EditPolicyBindingInner() {
	const { name } = Route.useParams();
	const { data: binding } = usePolicyBinding(name);
	const navigate = useNavigate();

	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/policy-bindings/$name" params={{ name }}>
						{displayLabel(binding.metadata)}
					</BackLink>
				}
				title="Edit policy binding"
			/>
			<PolicyBindingForm
				binding={binding}
				onSaved={(savedName) =>
					void navigate({
						to: "/policy-bindings/$name",
						params: { name: savedName },
					})
				}
				onCancel={() =>
					void navigate({ to: "/policy-bindings/$name", params: { name } })
				}
			/>
		</div>
	);
}

function EditPolicyBindingPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditPolicyBindingInner />
		</Suspense>
	);
}
