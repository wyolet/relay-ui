import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { budgetListQueryOptions } from "@/api/hooks/budgets";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { modelsListQueryOptions } from "@/api/hooks/models";
import {
	policiesListQueryOptions,
	policyDetailQueryOptions,
	usePolicy,
} from "@/api/hooks/policies";
import { poolListQueryOptions } from "@/api/hooks/pools";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { useMutability } from "@/hooks/useMutability";
import { displayLabel } from "@/lib/displayLabel";
import { PolicyForm } from "@/policies/PolicyForm";
import { PolicyInUseNotice } from "@/policies/PolicyInUseNotice";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/policies/$name_/edit")({
	loader: ({ context, params }) => {
		const { queryClient } = context;
		// PolicyForm's field pickers stream in behind its own render; warm them
		// without blocking the route so they don't suspend one after another.
		void queryClient.prefetchQuery(poolListQueryOptions);
		void queryClient.prefetchQuery(budgetListQueryOptions);
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(hostsListQueryOptions);
		void queryClient.prefetchQuery(providersListQueryOptions);
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void queryClient.prefetchQuery(keysListQueryOptions);
		void queryClient.prefetchQuery(policiesListQueryOptions);
		void queryClient.prefetchQuery(bindingsListQueryOptions);
		return Promise.all([
			queryClient.ensureQueryData(policyDetailQueryOptions(params.name)),
			queryClient.ensureQueryData(governanceQueryOptions("policy")),
		]);
	},
	component: EditPolicyPage,
});

function EditPolicyInner() {
	const { name } = Route.useParams();
	const { data: policy } = usePolicy(name);
	const navigate = useNavigate();
	const { canEdit } = useMutability(policy.metadata, "policy");

	if (!canEdit) {
		return (
			<PageHeader
				back={
					<BackLink to="/policies/$name" params={{ name }}>
						{displayLabel(policy.metadata)}
					</BackLink>
				}
				title="Host-owned policy"
				description={
					<>
						This policy is managed by Relay and can't be edited from the UI.
						Unlock editing for host-owned policies under{" "}
						<Link
							to="/settings/permissions"
							className="text-foreground underline hover:no-underline"
						>
							Settings → Edit permissions
						</Link>
						.
					</>
				}
			/>
		);
	}

	// The single read says up front whether an update would be refused for
	// reaching accounts the caller can't set; lists don't carry it.
	const blocked = policy.editable === false && policy.editBlockedBy;

	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/policies/$name" params={{ name }}>
						{displayLabel(policy.metadata)}
					</BackLink>
				}
				title={blocked ? "Used by accounts you can't change" : "Edit policy"}
			/>
			{blocked ? (
				<PolicyInUseNotice policy={policy} blockers={blocked} />
			) : (
				<PolicyForm
					policy={policy}
					onSaved={() =>
						void navigate({ to: "/policies/$name", params: { name } })
					}
					onCancel={() =>
						void navigate({ to: "/policies/$name", params: { name } })
					}
				/>
			)}
		</div>
	);
}

function EditPolicyPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditPolicyInner />
		</Suspense>
	);
}
