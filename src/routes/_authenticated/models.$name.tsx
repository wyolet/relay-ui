import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import {
	modelDetailQueryOptions,
	useDeleteModel,
	useModel,
} from "#/api/hooks/models";
import { ApiError } from "#/api/types/errors";
import type { DetailField } from "#/components/ResourceDetail";
import { ResourceDetail } from "#/components/ResourceDetail";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/models/$name")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(modelDetailQueryOptions(params.name)),
	component: ModelDetailPage,
});

function formatPricing(
	pricing: ReturnType<typeof useModel>["data"]["spec"]["pricing"],
): string {
	if (!pricing) return "—";
	const rates = pricing.rates ?? {};
	const entries = Object.entries(rates);
	if (entries.length === 0) return "—";
	const unit = pricing.unit || "1M tokens";
	const currency = pricing.currency || "USD";
	const sym = currency === "USD" ? "$" : `${currency} `;
	return entries
		.map(([k, v]) => `${sym}${v}/${unit} ${k}`)
		.join(" · ");
}

function capabilitiesSummary(
	cap: ReturnType<typeof useModel>["data"]["spec"]["capabilities"],
): string {
	if (!cap) return "—";
	return (
		Object.entries(cap)
			.filter(([, v]) => v === true)
			.map(([k]) => k)
			.join(", ") || "—"
	);
}

function ModelDetailInner() {
	const { name } = Route.useParams();
	const { data: model } = useModel(name);
	const deleteModel = useDeleteModel();
	const navigate = useNavigate();

	const fields: DetailField[] = [
		{ label: "Name", value: model.metadata.name },
		{
			label: "Provider",
			value: (
				<Link
					to="/providers/$name"
					params={{ name: model.spec.provider }}
					className="text-blue-600 hover:underline"
				>
					{model.spec.provider}
				</Link>
			),
		},
		{ label: "Upstream Name", value: model.spec.upstreamName },
		{
			label: "Capabilities",
			value: capabilitiesSummary(model.spec.capabilities),
		},
		{
			label: "Pricing",
			value: formatPricing(model.spec.pricing),
		},
	];

	async function handleDelete() {
		try {
			await deleteModel.mutateAsync(name);
			toast("success", `Model "${name}" deleted.`);
			void navigate({ to: "/models" });
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to delete model.");
			}
		}
	}

	return (
		<ResourceDetail
			title={model.metadata.name}
			fields={fields}
			editTo={`/models/${name}/edit`}
			backTo="/models"
			backLabel="Models"
			onDelete={handleDelete}
			isDeleting={deleteModel.isPending}
		/>
	);
}

function ModelDetailPage() {
	return (
		<Suspense
			fallback={
				<div className="text-gray-500 dark:text-zinc-400 text-sm">Loading…</div>
			}
		>
			<ModelDetailInner />
		</Suspense>
	);
}
