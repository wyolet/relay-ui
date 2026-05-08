import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	routeDetailQueryOptions,
	useRoute,
	useUpdateRoute,
} from "#/api/hooks/routes";
import type { ApiErrorBody } from "#/api/types/errors";
import { ApiError } from "#/api/types/errors";
import type { RelayRouteUpdate } from "#/api/types/route";
import type { FieldDef, FormValues } from "#/components/ResourceForm";
import { ResourceForm } from "#/components/ResourceForm";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/routes/$name/edit")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(routeDetailQueryOptions(params.name)),
	component: EditRoutePage,
});

const FIELDS: FieldDef[] = [
	{
		name: "models",
		label: "Models (comma-separated)",
		type: "text",
		required: true,
		placeholder: "gpt-4o, llama3",
	},
];

function EditRouteInner() {
	const { name } = Route.useParams();
	const { data: route } = useRoute(name);
	const updateRoute = useUpdateRoute(name);
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const modelsRaw = String(values.models ?? "");
		const models = modelsRaw
			.split(",")
			.map((m) => m.trim())
			.filter(Boolean);
		const payload: RelayRouteUpdate = {
			metadata: route.metadata,
			spec: {
				models: models.length > 0 ? models : null,
				default: route.spec.default,
			},
		};
		try {
			await updateRoute.mutateAsync(payload);
			toast("success", `Route "${name}" updated.`);
			void navigate({ to: "/routes/$name", params: { name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to update route.");
			}
		}
	}

	return (
		<ResourceForm
			title={`Edit Route: ${name}`}
			fields={FIELDS}
			initialValues={{
				models: (route.spec.models ?? []).join(", "),
			}}
			onSubmit={handleSubmit}
			onCancel={() => void navigate({ to: "/routes/$name", params: { name } })}
			isPending={updateRoute.isPending}
			serverError={serverError}
		/>
	);
}

function EditRoutePage() {
	return (
		<Suspense
			fallback={
				<div className="text-neutral-500 dark:text-neutral-400 text-sm">Loading…</div>
			}
		>
			<EditRouteInner />
		</Suspense>
	);
}
