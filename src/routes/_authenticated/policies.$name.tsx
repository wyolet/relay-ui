import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { budgetListQueryOptions } from "@/api/hooks/budgets";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
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
import { poolListQueryOptions } from "@/api/hooks/pools";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import {
	type PolicyDetailTab,
	PolicyDetailView,
} from "@/policies/PolicyDetailView";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

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
		void queryClient.prefetchQuery(poolListQueryOptions);
		void queryClient.prefetchQuery(budgetListQueryOptions);
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(hostsListQueryOptions);
		void queryClient.prefetchQuery(bindingsListQueryOptions);
		void queryClient.prefetchQuery(providersListQueryOptions);
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void queryClient.prefetchQuery(keysListQueryOptions);
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
	const del = useConfirmedDelete(useDeletePolicy(), {
		noun: "policy",
		onDeleted: () =>
			void navigate({ to: "/policies", search: { tab: "policies" } }),
	});
	const updatePolicy = useUpdatePolicy();
	const toastSaveError = useSaveErrorToast();

	async function handleToggleEnabled() {
		const next = !(policy.spec.enabled !== false);
		try {
			await updatePolicy.mutateAsync({
				id: policy.metadata.id ?? "",
				body: { ...policy, spec: { ...policy.spec, enabled: next } },
			});
			toast("success", next ? "Policy enabled." : "Policy disabled.");
		} catch (err) {
			toastSaveError(err, "Failed to toggle policy.");
		}
	}

	return (
		<>
			<PolicyDetailView
				policy={policy}
				tab={tab}
				onTabChange={(next: PolicyDetailTab) =>
					void navigate({ search: (prev) => ({ ...prev, tab: next }) })
				}
				onDelete={() =>
					del.request({
						id: policy.metadata.id ?? "",
						name: policy.metadata.name,
						label: displayLabel(policy.metadata),
					})
				}
				onToggleEnabled={() => void handleToggleEnabled()}
				deleting={del.isPending}
				toggling={updatePolicy.isPending}
			/>
			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
			)}
		</>
	);
}

function PolicyDetailPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<PolicyDetailInner />
		</Suspense>
	);
}
