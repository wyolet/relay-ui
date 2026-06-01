import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import {
	modelDetailQueryOptions,
	modelsListQueryOptions,
	useDeleteModel,
	useModel,
	useUpdateModel,
} from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import { displayLabel } from "@/lib/displayLabel";
import { type ModelDetailTab, ModelDetailView } from "@/models/ModelDetailView";
import { confirm } from "@/shared/ConfirmDialog";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";

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
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(modelDetailQueryOptions(params.name)),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(relayKeysListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
			context.queryClient.ensureQueryData(governanceQueryOptions("model")),
		]),
	component: ModelDetailPage,
});

function ModelDetailInner() {
	const { name } = Route.useParams();
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: "/models/$name" });
	const { data: model } = useModel(name);
	const updateModel = useUpdateModel(model.metadata.id ?? "");
	const deleteModel = useDeleteModel();

	async function handleDelete() {
		const ok = await confirm({
			title: `Delete model ${name}?`,
			description:
				"Policies and keys referencing this model will lose access until reattached.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteModel.mutateAsync(model.metadata.id ?? "");
			toast("success", `Model "${displayLabel(model.metadata)}" deleted.`);
			void navigate({ to: "/models" });
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete model.",
			);
		}
	}

	async function handleToggleEnabled() {
		const next = !(model.spec.enabled !== false);
		try {
			await updateModel.mutateAsync({
				metadata: model.metadata,
				spec: { ...model.spec, enabled: next },
			});
			toast("success", next ? "Model enabled." : "Model disabled.");
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to toggle model.",
			);
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
				onDelete={() => void handleDelete()}
				deleting={deleteModel.isPending}
			/>
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
