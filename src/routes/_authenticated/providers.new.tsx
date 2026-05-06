import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateProvider } from "#/api/hooks/providers";
import type { ApiErrorBody } from "#/api/types/errors";
import { ApiError } from "#/api/types/errors";
import type { ProviderCreate } from "#/api/types/provider";
import type { FieldDef, FormValues } from "#/components/ResourceForm";
import { ResourceForm } from "#/components/ResourceForm";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/providers/new")({
	component: NewProviderPage,
});

const FIELDS: FieldDef[] = [
	{
		name: "name",
		label: "Name",
		type: "text",
		required: true,
		placeholder: "my-provider",
	},
	{
		name: "kind",
		label: "Kind",
		type: "select",
		required: true,
		options: [
			{ value: "openai", label: "OpenAI" },
			{ value: "ollama", label: "Ollama" },
		],
	},
	{
		name: "endpoint",
		label: "Endpoint URL",
		type: "url",
		required: true,
		placeholder: "https://api.openai.com",
	},
	{
		name: "secret",
		label: "Secret name (optional)",
		type: "text",
		placeholder: "openai-key",
	},
];

function NewProviderPage() {
	const navigate = useNavigate();
	const createProvider = useCreateProvider();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const payload: ProviderCreate = {
			name: String(values.name ?? ""),
			kind:
				values.kind === "openai" || values.kind === "ollama"
					? values.kind
					: "openai",
			endpoint: String(values.endpoint ?? ""),
			secret: values.secret ? String(values.secret) : undefined,
		};
		try {
			await createProvider.mutateAsync(payload);
			toast("success", `Provider "${payload.name}" created.`);
			void navigate({ to: "/providers/$name", params: { name: payload.name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to create provider.");
			}
		}
	}

	return (
		<ResourceForm
			title="New Provider"
			fields={FIELDS}
			onSubmit={handleSubmit}
			onCancel={() => void navigate({ to: "/providers" })}
			isPending={createProvider.isPending}
			serverError={serverError}
		/>
	);
}
