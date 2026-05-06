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
		name: "baseURL",
		label: "Base URL",
		type: "url",
		required: true,
		placeholder: "https://api.openai.com",
	},
];

function NewProviderPage() {
	const navigate = useNavigate();
	const createProvider = useCreateProvider();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const name = String(values.name ?? "");
		const payload: ProviderCreate = {
			metadata: { name },
			spec: {
				kind: String(values.kind ?? "openai"),
				baseURL: String(values.baseURL ?? ""),
			},
		};
		try {
			await createProvider.mutateAsync(payload);
			toast("success", `Provider "${name}" created.`);
			void navigate({ to: "/providers/$name", params: { name } });
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
