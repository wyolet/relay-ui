import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	modelDetailQueryOptions,
	useModel,
	useUpdateModel,
} from "#/api/hooks/models";
import type { ApiErrorBody } from "#/api/types/errors";
import { ApiError } from "#/api/types/errors";
import type { ModelCapability, ModelUpdate } from "#/api/types/model";
import type { FieldDef, FormValues } from "#/components/ResourceForm";
import { ResourceForm } from "#/components/ResourceForm";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/models/$name/edit")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(modelDetailQueryOptions(params.name)),
	component: EditModelPage,
});

const CAPABILITY_OPTIONS: { value: ModelCapability; label: string }[] = [
	{ value: "chat", label: "Chat" },
	{ value: "embeddings", label: "Embeddings" },
	{ value: "completions", label: "Completions" },
	{ value: "vision", label: "Vision" },
];

const FIELDS: FieldDef[] = [
	{
		name: "provider",
		label: "Provider name",
		type: "text",
		required: true,
		placeholder: "my-provider",
	},
	{
		name: "upstream_name",
		label: "Upstream model name",
		type: "text",
		required: true,
		placeholder: "gpt-4o",
	},
	{
		name: "capabilities",
		label: "Capabilities",
		type: "multiselect",
		required: true,
		options: CAPABILITY_OPTIONS,
	},
	{
		name: "input_per_million",
		label: "Input cost per 1M tokens (USD)",
		type: "number",
		placeholder: "2.50",
	},
	{
		name: "output_per_million",
		label: "Output cost per 1M tokens (USD)",
		type: "number",
		placeholder: "10.00",
	},
];

const ALL_CAPABILITIES = new Set<string>([
	"chat",
	"embeddings",
	"completions",
	"vision",
]);

function toCapabilities(value: string | string[]): ModelCapability[] {
	const arr = Array.isArray(value) ? value : [];
	return arr.filter((v): v is ModelCapability => ALL_CAPABILITIES.has(v));
}

function EditModelInner() {
	const { name } = Route.useParams();
	const { data: model } = useModel(name);
	const updateModel = useUpdateModel(name);
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const inputPM = Number(values.input_per_million);
		const outputPM = Number(values.output_per_million);
		const hasPricing =
			!Number.isNaN(inputPM) &&
			!Number.isNaN(outputPM) &&
			String(values.input_per_million).trim() !== "" &&
			String(values.output_per_million).trim() !== "";

		const payload: ModelUpdate = {
			provider: String(values.provider ?? ""),
			upstream_name: String(values.upstream_name ?? ""),
			capabilities: toCapabilities(values.capabilities),
			pricing: hasPricing
				? { input_per_million: inputPM, output_per_million: outputPM }
				: undefined,
		};
		try {
			await updateModel.mutateAsync(payload);
			toast("success", `Model "${name}" updated.`);
			void navigate({ to: "/models/$name", params: { name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to update model.");
			}
		}
	}

	return (
		<ResourceForm
			title={`Edit Model: ${name}`}
			fields={FIELDS}
			initialValues={{
				provider: model.provider,
				upstream_name: model.upstream_name,
				capabilities: model.capabilities,
				input_per_million: model.pricing
					? String(model.pricing.input_per_million)
					: "",
				output_per_million: model.pricing
					? String(model.pricing.output_per_million)
					: "",
			}}
			onSubmit={handleSubmit}
			onCancel={() => void navigate({ to: "/models/$name", params: { name } })}
			isPending={updateModel.isPending}
			serverError={serverError}
		/>
	);
}

function EditModelPage() {
	return (
		<Suspense
			fallback={
				<div className="text-gray-500 dark:text-zinc-400 text-sm">Loading…</div>
			}
		>
			<EditModelInner />
		</Suspense>
	);
}
