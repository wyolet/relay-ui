import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateRoute } from "#/api/hooks/routes";
import type { ApiErrorBody } from "#/api/types/errors";
import { ApiError } from "#/api/types/errors";
import type { RelayRouteCreate } from "#/api/types/route";
import type { FieldDef, FormValues } from "#/components/ResourceForm";
import { ResourceForm } from "#/components/ResourceForm";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/routes/new")({
	component: NewRoutePage,
});

const FIELDS: FieldDef[] = [
	{
		name: "name",
		label: "Name",
		type: "text",
		required: true,
		placeholder: "my-route",
	},
	{
		name: "models",
		label: "Models (comma-separated)",
		type: "text",
		required: true,
		placeholder: "gpt-4o, llama3",
	},
];

function NewRoutePage() {
	const navigate = useNavigate();
	const createRoute = useCreateRoute();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const name = String(values.name ?? "");
		const modelsRaw = String(values.models ?? "");
		const models = modelsRaw
			.split(",")
			.map((m) => m.trim())
			.filter(Boolean);
		const payload: RelayRouteCreate = {
			metadata: { name },
			spec: {
				models: models.length > 0 ? models : null,
			},
		};
		try {
			await createRoute.mutateAsync(payload);
			toast("success", `Route "${name}" created.`);
			void navigate({ to: "/routes/$name", params: { name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to create route.");
			}
		}
	}

	return (
		<ResourceForm
			title="New Route"
			fields={FIELDS}
			onSubmit={handleSubmit}
			onCancel={() => void navigate({ to: "/routes" })}
			isPending={createRoute.isPending}
			serverError={serverError}
		/>
	);
}
