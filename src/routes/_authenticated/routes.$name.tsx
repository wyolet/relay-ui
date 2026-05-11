import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import {
	routeDetailQueryOptions,
	useDeleteRoute,
	useRoute,
} from "@/api/hooks/routes";
import { ApiError } from "@/api/types/errors";
import type { DetailField } from "@/components/ResourceDetail";
import { ResourceDetail } from "@/components/ResourceDetail";
import { toast } from "@/components/Toast";

export const Route = createFileRoute("/_authenticated/routes/$name")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(routeDetailQueryOptions(params.name)),
	component: RouteDetailPage,
});

function RouteDetailInner() {
	const { name } = Route.useParams();
	const { data: route } = useRoute(name);
	const deleteRoute = useDeleteRoute();
	const navigate = useNavigate();

	const fields: DetailField[] = [
		{ label: "Name", value: route.metadata.name },
		{
			label: "Models",
			value: (route.spec.models ?? []).join(", ") || "—",
		},
		{ label: "Default", value: route.spec.default ? "Yes" : "No" },
	];

	async function handleDelete() {
		try {
			await deleteRoute.mutateAsync(route.metadata.id ?? "");
			toast("success", `Route "${name}" deleted.`);
			void navigate({ to: "/routes" });
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to delete route.");
			}
		}
	}

	return (
		<ResourceDetail
			title={route.metadata.name}
			fields={fields}
			editTo={`/routes/${name}/edit`}
			backTo="/routes"
			backLabel="Routes"
			onDelete={handleDelete}
			isDeleting={deleteRoute.isPending}
		/>
	);
}

function RouteDetailPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<RouteDetailInner />
		</Suspense>
	);
}
