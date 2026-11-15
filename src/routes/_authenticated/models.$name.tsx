import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import {
	modelDetailQueryOptions,
	modelHostsQueryOptions,
	modelPoliciesQueryOptions,
	modelsListQueryOptions,
	useDeleteModel,
	useModel,
	useUpdateModel,
} from "@/api/hooks/models";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { usageNow } from "@/api/hooks/usage";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { ModelDetailView } from "@/models/ModelDetailView";
import { modelWeekQueries } from "@/models/modelWeekQueries";
import {
	pricingGraphQuery,
	pricingsMatrixListQuery,
} from "@/pricing/usePricingMatrix";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export const Route = createFileRoute("/_authenticated/models/$name")({
	loader: async ({ context, params }) => {
		const { queryClient } = context;
		// The pricing matrix prices each host's line; it never gates the page.
		void queryClient.prefetchQuery(pricingGraphQuery);
		void queryClient.prefetchQuery(pricingsMatrixListQuery);
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(hostsListQueryOptions);
		const [model] = await Promise.all([
			queryClient.ensureQueryData(modelDetailQueryOptions(params.name)),
			queryClient.ensureQueryData(modelHostsQueryOptions(params.name)),
			queryClient.ensureQueryData(modelPoliciesQueryOptions(params.name)),
			queryClient.ensureQueryData(providersListQueryOptions),
			queryClient.ensureQueryData(governanceQueryOptions("model")),
		]);
		// Usage filters by id, known only once the model has loaded.
		const id = model.metadata.id;
		if (id) {
			const week = modelWeekQueries(id, usageNow());
			void queryClient.prefetchQuery(week.totals);
			void queryClient.prefetchQuery(week.series);
			void queryClient.prefetchQuery(week.byHost);
			void queryClient.prefetchQuery(week.recent);
		}
	},
	component: ModelDetailPage,
});

function ModelDetailInner() {
	const { name } = Route.useParams();
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
				className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Models
			</Link>
			<ModelDetailView
				model={model}
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
