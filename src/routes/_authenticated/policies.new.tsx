import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { budgetListQueryOptions } from "@/api/hooks/budgets";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { poolListQueryOptions } from "@/api/hooks/pools";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { PolicyForm } from "@/policies/PolicyForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/policies/new")({
	loader: ({ context }) => {
		const { queryClient } = context;
		// Nothing gates first paint — PolicyForm's pickers stream in behind its
		// own render; warm them all.
		void queryClient.prefetchQuery(poolListQueryOptions);
		void queryClient.prefetchQuery(budgetListQueryOptions);
		void queryClient.prefetchQuery(providersListQueryOptions);
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(hostsListQueryOptions);
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void queryClient.prefetchQuery(policiesListQueryOptions);
		void queryClient.prefetchQuery(keysListQueryOptions);
		void queryClient.prefetchQuery(bindingsListQueryOptions);
		return null;
	},
	component: NewPolicyPage,
});

function NewPolicyInner() {
	const navigate = useNavigate();
	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/policies" search={{ tab: "policies" }}>
						Policies
					</BackLink>
				}
				title="New policy"
				description="Which pools and models requests may use, and the limits on them. Teams, projects and service accounts attach it from their own page."
			/>
			<PolicyForm
				onSaved={(name) =>
					void navigate({ to: "/policies/$name", params: { name } })
				}
				onCancel={() =>
					void navigate({ to: "/policies", search: { tab: "policies" } })
				}
			/>
		</div>
	);
}

function NewPolicyPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<NewPolicyInner />
		</Suspense>
	);
}
