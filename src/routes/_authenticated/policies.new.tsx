import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { PolicyForm } from "@/policies/PolicyForm";

export const Route = createFileRoute("/_authenticated/policies/new")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(providersListQueryOptions),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(relayKeysListQueryOptions),
		]),
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
					attach to relay keys.
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
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<NewPolicyInner />
		</Suspense>
	);
}
