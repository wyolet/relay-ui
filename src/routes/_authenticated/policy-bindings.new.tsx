import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { PolicyBindingForm } from "@/policy-bindings/PolicyBindingForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	project_id: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/policy-bindings/new")({
	validateSearch: searchSchema,
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(projectsListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(accountListQueryOptions),
		]),
	component: NewPolicyBindingPage,
});

function NewPolicyBindingInner() {
	const { project_id } = Route.useSearch();
	const navigate = useNavigate();
	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/policies" search={{ tab: "bindings" }}>
						Policy bindings
					</BackLink>
				}
				title="New policy binding"
				description="A request must pass the policy of every account it climbs: its team, its project, and the account it runs in."
			/>
			<PolicyBindingForm
				projectId={project_id}
				onSaved={(name) =>
					void navigate({ to: "/policy-bindings/$name", params: { name } })
				}
				onCancel={() =>
					void navigate({ to: "/policies", search: { tab: "bindings" } })
				}
			/>
		</div>
	);
}

function NewPolicyBindingPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<NewPolicyBindingInner />
		</Suspense>
	);
}
