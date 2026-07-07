import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import {
	policyDetailQueryOptions,
	policyHostsQueryOptions,
	policyModelsQueryOptions,
	policyRateLimitsQueryOptions,
	useDeletePolicy,
	usePolicy,
	useUpdatePolicy,
} from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import { displayLabel } from "@/lib/displayLabel";
import {
	type PolicyDetailTab,
	PolicyDetailView,
} from "@/policies/PolicyDetailView";
import { confirm } from "@/shared/ConfirmDialog";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";

const searchSchema = z.object({
	tab: z
		.enum(["overview", "models", "keys", "rate-limits", "usage", "logs"])
		.optional()
		.default("overview"),
});

export const Route = createFileRoute("/_authenticated/policies/$name")({
	validateSearch: searchSchema,
	loader: ({ context, params }) => {
		const { queryClient } = context;
		// Tab data streams in behind per-tab Suspense boundaries; only the
		// detail doc + governance gate the header's first paint.
		void queryClient.prefetchQuery(policyModelsQueryOptions(params.name));
		void queryClient.prefetchQuery(policyHostsQueryOptions(params.name));
		void queryClient.prefetchQuery(policyRateLimitsQueryOptions(params.name));
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(hostsListQueryOptions);
		void queryClient.prefetchQuery(bindingsListQueryOptions);
		void queryClient.prefetchQuery(providersListQueryOptions);
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void queryClient.prefetchQuery(relayKeysListQueryOptions);
		return Promise.all([
			queryClient.ensureQueryData(policyDetailQueryOptions(params.name)),
			queryClient.ensureQueryData(governanceQueryOptions("policy")),
		]);
	},
	component: PolicyDetailPage,
});

function PolicyDetailInner() {
	const { name } = Route.useParams();
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: "/policies/$name" });
	const { data: policy } = usePolicy(name);
	const deletePolicy = useDeletePolicy();
	const updatePolicy = useUpdatePolicy();

	async function handleDelete() {
		const ok = await confirm({
			title: `Delete policy ${name}?`,
			description:
				"Relay keys using this policy will lose access until reattached.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deletePolicy.mutateAsync(policy.metadata.id ?? "");
			toast("success", `Policy "${displayLabel(policy.metadata)}" deleted.`);
			void navigate({ to: "/policies", search: { tab: "policies" } });
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete policy.",
			);
		}
	}

	async function handleToggleEnabled() {
		const next = !(policy.spec.enabled !== false);
		try {
			await updatePolicy.mutateAsync({
				id: policy.metadata.id ?? "",
				body: { ...policy, spec: { ...policy.spec, enabled: next } },
			});
			toast("success", next ? "Policy enabled." : "Policy disabled.");
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to toggle policy.",
			);
		}
	}

	return (
		<PolicyDetailView
			policy={policy}
			tab={tab}
			onTabChange={(next: PolicyDetailTab) =>
				void navigate({ search: (prev) => ({ ...prev, tab: next }) })
			}
			onDelete={() => void handleDelete()}
			onToggleEnabled={() => void handleToggleEnabled()}
			deleting={deletePolicy.isPending}
			toggling={updatePolicy.isPending}
		/>
	);
}

function PolicyDetailPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<PolicyDetailInner />
		</Suspense>
	);
}
