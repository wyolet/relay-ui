import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
import {
	modelDetailQueryOptions,
	modelHostsQueryOptions,
	modelPoliciesQueryOptions,
	modelsListQueryOptions,
	useDeleteModel,
	useModel,
	useUpdateModel,
} from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { type ModelDetailTab, ModelDetailView } from "@/models/ModelDetailView";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

const searchSchema = z.object({
	tab: z
		.enum([
			"overview",
			"hosts",
			"policies",
			"limits",
			"pricing",
			"usage",
			"logs",
		])
		.optional()
		.default("overview"),
});

export const Route = createFileRoute("/_authenticated/models/$name")({
	validateSearch: searchSchema,
	loader: ({ context, params }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(policiesListQueryOptions);
		void queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void queryClient.prefetchQuery(keysListQueryOptions);
		void queryClient.prefetchQuery(bindingsListQueryOptions);
		return Promise.all([
			queryClient.ensureQueryData(modelDetailQueryOptions(params.name)),
			queryClient.ensureQueryData(modelHostsQueryOptions(params.name)),
			queryClient.ensureQueryData(modelPoliciesQueryOptions(params.name)),
			queryClient.ensureQueryData(providersListQueryOptions),
			queryClient.ensureQueryData(hostsListQueryOptions),
			queryClient.ensureQueryData(governanceQueryOptions("model")),
		]);
	},
	component: ModelDetailPage,
});

function ModelDetailInner() {
	const { name } = Route.useParams();
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: "/models/$name" });
	const { data: model } = useModel(name);
	const updateModel = useUpdateModel();
	const toastSaveError = useSaveErrorToast();
	const del = useConfirmedDelete(useDeleteModel(), {
		noun: "model",
		onDeleted: () => void navigate({ to: "/models" }),
	});

	async function handleToggleEnabled() {
		const next = !(model.spec.enabled !== false);
		try {
			await updateModel.mutateAsync({
				id: model.metadata.id ?? "",
				body: {
					metadata: model.metadata,
					spec: { ...model.spec, enabled: next },
				},
			});
			toast("success", next ? "Model enabled." : "Model disabled.");
		} catch (err) {
			toastSaveError(err, "Failed to toggle model.");
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
			<ModelDetailView
				model={model}
				tab={tab}
				onTabChange={(next: ModelDetailTab) =>
					void navigate({ search: (prev) => ({ ...prev, tab: next }) })
				}
				onToggleEnabled={() => void handleToggleEnabled()}
				toggling={updateModel.isPending}
				onDelete={() =>
					del.request({
						id: model.metadata.id ?? "",
						name: model.metadata.name,
						label: displayLabel(model.metadata),
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

function ModelDetailPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<ModelDetailInner />
		</Suspense>
	);
}
