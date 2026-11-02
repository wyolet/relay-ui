import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import {
	providerDetailQueryOptions,
	providersListQueryOptions,
	useDeleteProvider,
	useProvider,
	useUpdateProvider,
} from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import {
	type ProviderDetailTab,
	ProviderDetailView,
} from "@/providers/ProviderDetailView";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

const searchSchema = z.object({
	tab: z.enum(["overview", "models", "hosts"]).optional().default("overview"),
});

export const Route = createFileRoute("/_authenticated/providers/$name")({
	validateSearch: searchSchema,
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				providerDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(providersListQueryOptions),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(bindingsListQueryOptions),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(keysListQueryOptions),
			context.queryClient.ensureQueryData(governanceQueryOptions("provider")),
		]),
	component: ProviderDetailPage,
});

function ProviderDetailInner() {
	const { name } = Route.useParams();
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: "/providers/$name" });
	const { data: provider } = useProvider(name);
	const updateProvider = useUpdateProvider();
	const toastSaveError = useSaveErrorToast();
	const del = useConfirmedDelete(useDeleteProvider(), {
		noun: "provider",
		onDeleted: () => void navigate({ to: "/models" }),
	});

	async function handleToggleEnabled() {
		const next = !(provider.spec.enabled !== false);
		try {
			await updateProvider.mutateAsync({
				id: provider.metadata.id ?? "",
				body: {
					metadata: provider.metadata,
					spec: { ...provider.spec, enabled: next },
				},
			});
			toast("success", next ? "Provider enabled." : "Provider disabled.");
		} catch (err) {
			toastSaveError(err, "Failed to toggle provider.");
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<Link
				to="/models"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Models
			</Link>
			<ProviderDetailView
				provider={provider}
				tab={tab}
				onTabChange={(next: ProviderDetailTab) =>
					void navigate({ search: (prev) => ({ ...prev, tab: next }) })
				}
				onToggleEnabled={() => void handleToggleEnabled()}
				toggling={updateProvider.isPending}
				onDelete={() =>
					del.request({
						id: provider.metadata.id ?? "",
						name: provider.metadata.name,
						label: displayLabel(provider.metadata),
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

function ProviderDetailPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<ProviderDetailInner />
		</Suspense>
	);
}
