import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { PolicyForm } from "@/policies/PolicyForm";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/policies/new")({
	loader: ({ context }) => {
		const { queryClient } = context;
		// Nothing gates first paint — PolicyForm's pickers stream in behind its
		// own render; warm them all (incl. bindings for usePolicyHostRequirements).
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
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/policies"
					search={{ tab: "policies" }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Policies
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					New policy
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Bundle upstream credentials, allowed models, and rate limits, then
					attach to keys.
				</p>
			</div>
			<PolicyForm
				onSaved={() =>
					void navigate({ to: "/policies", search: { tab: "policies" } })
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
