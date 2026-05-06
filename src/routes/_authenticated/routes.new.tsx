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
		name: "pool",
		label: "Pool name",
		type: "text",
		required: true,
		placeholder: "my-pool",
	},
	{
		name: "acl",
		label: "ACL spec",
		type: "textarea",
		rows: 6,
		placeholder: "allow *\ndeny admin",
	},
];

function NewRoutePage() {
	const navigate = useNavigate();
	const createRoute = useCreateRoute();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const payload: RelayRouteCreate = {
			name: String(values.name ?? ""),
			pool: String(values.pool ?? ""),
			acl: String(values.acl ?? ""),
		};
		try {
			await createRoute.mutateAsync(payload);
			toast("success", `Route "${payload.name}" created.`);
			void navigate({ to: "/routes/$name", params: { name: payload.name } });
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
