import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import {
	hostDetailQueryOptions,
	hostPoliciesQueryOptions,
	hostsListQueryOptions,
	useDeleteHost,
	useHost,
	useUpdateHost,
} from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { type HostDetailTab, HostDetailView } from "@/hosts/HostDetailView";
import { displayLabel } from "@/lib/displayLabel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

const searchSchema = z.object({
	tab: z
		.enum([
			"overview",
			"configuration",
			"host-policies",
			"user-policies",
			"host-keys",
			"models",
			"usage",
			"logs",
		])
		.optional()
		.default("overview"),
});

export const Route = createFileRoute("/_authenticated/hosts/$name")({
	validateSearch: searchSchema,
	loader: ({ context, params }) => {
		const { queryClient } = context;
		// The reference lists feed the per-tab loaders, which stream in behind
		// each tab's Suspense boundary; only the detail doc + governance gate
		// the header's first paint.
		void queryClient.prefetchQuery(hostsListQueryOptions);
		void queryClient.prefetchQuery(bindingsListQueryOptions);
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(policiesListQueryOptions);
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void queryClient.prefetchQuery(keysListQueryOptions);
		void queryClient.prefetchQuery(providersListQueryOptions);
		void queryClient.prefetchQuery(accountListQueryOptions);
		void queryClient.prefetchQuery(hostPoliciesQueryOptions(params.name));
		return Promise.all([
			queryClient.ensureQueryData(hostDetailQueryOptions(params.name)),
			queryClient.ensureQueryData(governanceQueryOptions("host")),
		]);
	},
	component: HostDetailPage,
});

function HostDetailInner() {
	const { name } = Route.useParams();
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: "/hosts/$name" });
	const { data: host } = useHost(name);
	const updateHost = useUpdateHost();
	const toastSaveError = useSaveErrorToast();
	const del = useConfirmedDelete(useDeleteHost(), {
		noun: "host",
		onDeleted: () => void navigate({ to: "/models", search: { tab: "hosts" } }),
	});

	async function handleToggleEnabled() {
		const next = !(host.spec.enabled !== false);
		try {
			await updateHost.mutateAsync({
				id: host.metadata.id ?? "",
				body: {
					metadata: host.metadata,
					spec: { ...host.spec, enabled: next },
				},
			});
			toast("success", next ? "Host enabled." : "Host disabled.");
		} catch (err) {
			toastSaveError(err, "Failed to toggle host.");
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<Link
				to="/models"
				search={(prev) => ({ ...prev, tab: "hosts" as const })}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Hosts
			</Link>
			<HostDetailView
				host={host}
				tab={tab}
				onTabChange={(next: HostDetailTab) =>
					void navigate({ search: (prev) => ({ ...prev, tab: next }) })
				}
				onToggleEnabled={() => void handleToggleEnabled()}
				toggling={updateHost.isPending}
				onDelete={() =>
					del.request({
						id: host.metadata.id ?? "",
						name: host.metadata.name,
						label: displayLabel(host.metadata),
					})
				}
				deleting={del.isPending}
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
		</div>
	);
}

function HostDetailPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<HostDetailInner />
		</Suspense>
	);
}
