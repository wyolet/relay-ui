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

function EditRouteInner() {
	const { name } = Route.useParams();
	const { data: route } = useRoute(name);
	const updateRoute = useUpdateRoute(name);
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const payload: RelayRouteUpdate = {
			pool: String(values.pool ?? ""),
			acl: String(values.acl ?? ""),
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
				pool: route.pool,
				acl: route.acl,
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
		<Suspense fallback={<div className="text-gray-500 text-sm">Loading…</div>}>
			<EditRouteInner />
		</Suspense>
	);
}
