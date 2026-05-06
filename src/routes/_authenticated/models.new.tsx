import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateModel } from "#/api/hooks/models";
import type { ApiErrorBody } from "#/api/types/errors";
import { ApiError } from "#/api/types/errors";
import type { ModelCapability, ModelCreate } from "#/api/types/model";
import type { FieldDef, FormValues } from "#/components/ResourceForm";
import { ResourceForm } from "#/components/ResourceForm";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/models/new")({
	component: NewModelPage,
});

const CAPABILITY_OPTIONS: { value: ModelCapability; label: string }[] = [
	{ value: "chat", label: "Chat" },
	{ value: "embeddings", label: "Embeddings" },
	{ value: "completions", label: "Completions" },
	{ value: "vision", label: "Vision" },
];

const FIELDS: FieldDef[] = [
	{
		name: "name",
		label: "Name",
		type: "text",
		required: true,
		placeholder: "gpt-4o",
	},
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

function NewModelPage() {
	const navigate = useNavigate();
	const createModel = useCreateModel();
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

		const payload: ModelCreate = {
			name: String(values.name ?? ""),
			provider: String(values.provider ?? ""),
			upstream_name: String(values.upstream_name ?? ""),
			capabilities: toCapabilities(values.capabilities),
			pricing: hasPricing
				? { input_per_million: inputPM, output_per_million: outputPM }
				: undefined,
		};
		try {
			await createModel.mutateAsync(payload);
			toast("success", `Model "${payload.name}" created.`);
			void navigate({ to: "/models/$name", params: { name: payload.name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to create model.");
			}
		}
	}

	return (
		<ResourceForm
			title="New Model"
			fields={FIELDS}
			onSubmit={handleSubmit}
			onCancel={() => void navigate({ to: "/models" })}
			isPending={createModel.isPending}
			serverError={serverError}
		/>
	);
}
