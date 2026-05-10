import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	providerDetailQueryOptions,
	useProvider,
	useUpdateProvider,
} from "@/api/hooks/providers";
import type { ApiErrorBody } from "@/api/types/errors";
import { ApiError } from "@/api/types/errors";
import type { ProviderUpdate } from "@/api/types/provider";
import type { FieldDef, FormValues } from "@/components/ResourceForm";
import { ResourceForm } from "@/components/ResourceForm";
import { toast } from "@/components/Toast";

export const Route = createFileRoute("/_authenticated/providers/$name/edit")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			providerDetailQueryOptions(params.name),
		),
	component: EditProviderPage,
});

const FIELDS: FieldDef[] = [
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

function EditProviderInner() {
	const { name } = Route.useParams();
	const { data: provider } = useProvider(name);
	const updateProvider = useUpdateProvider(name);
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const payload: ProviderUpdate = {
			metadata: { name },
			spec: {
				kind: String(values.kind ?? provider.spec.kind),
				baseURL: String(values.baseURL ?? ""),
			},
		};
		try {
			await updateProvider.mutateAsync(payload);
			toast("success", `Provider "${name}" updated.`);
			void navigate({ to: "/providers/$name", params: { name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to update provider.");
			}
		}
	}

	return (
		<ResourceForm
			title={`Edit Provider: ${name}`}
			fields={FIELDS}
			initialValues={{
				kind: provider.spec.kind,
				baseURL: provider.spec.baseURL,
			}}
			onSubmit={handleSubmit}
			onCancel={() =>
				void navigate({ to: "/providers/$name", params: { name } })
			}
			isPending={updateProvider.isPending}
			serverError={serverError}
		/>
	);
}

function EditProviderPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<EditProviderInner />
		</Suspense>
	);
}
