import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { governanceQueryOptions, useGovernance } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policyDetailQueryOptions, usePolicy } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { displayLabel } from "@/lib/displayLabel";
import { resolveMutability } from "@/lib/ownership";
import { PolicyForm } from "@/policies/PolicyForm";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/policies/$name_/edit")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				policyDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(relayKeysListQueryOptions),
			context.queryClient.ensureQueryData(governanceQueryOptions("policy")),
		]),
	component: EditPolicyPage,
});

function EditPolicyInner() {
	const { name } = Route.useParams();
	const { data: policy } = usePolicy(name);
	const navigate = useNavigate();
	const gov = useGovernance("policy");
	const { canEdit } = resolveMutability(policy.metadata.owner?.kind, gov);

	if (!canEdit) {
		return (
			<div className="flex flex-col gap-3 max-w-xl">
				<Link
					to="/policies/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(policy.metadata)}
				</Link>
				<h1 className="text-xl font-semibold text-foreground">
					Host-owned policy
				</h1>
				<p className="text-sm text-muted-foreground">
					This policy is managed by Relay and can't be edited from the UI.
					Unlock editing for host-owned policies under{" "}
					<Link
						to="/settings/permissions"
						className="text-foreground underline hover:no-underline"
					>
						Settings → Edit permissions
					</Link>
					.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/policies/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(policy.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit policy
				</h1>
			</div>
			<PolicyForm
				policy={policy}
				onSaved={() =>
					void navigate({ to: "/policies/$name", params: { name } })
				}
				onCancel={() =>
					void navigate({ to: "/policies/$name", params: { name } })
				}
			/>
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
