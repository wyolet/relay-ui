import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import {
	policyDetailQueryOptions,
	useDeletePolicy,
	useUpdatePolicy,
	usePolicy,
} from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import { confirm } from "@/shared/ConfirmDialog";
import { toast } from "@/shared/Toast";
import {
	PolicyDetailView,
	type PolicyDetailTab,
} from "@/policies/PolicyDetailView";
import { displayLabel } from "@/lib/displayLabel";

const searchSchema = z.object({
	tab: z
		.enum(["overview", "models", "keys", "rate-limits", "usage", "logs"])
		.optional()
		.default("overview"),
});

export const Route = createFileRoute("/_authenticated/policies/$name")({
	validateSearch: searchSchema,
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
		]),
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
				...policy,
				spec: { ...policy.spec, enabled: next },
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
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<PolicyDetailInner />
		</Suspense>
	);
}
