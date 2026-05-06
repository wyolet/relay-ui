import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import {
	routeDetailQueryOptions,
	useDeleteRoute,
	useRoute,
} from "#/api/hooks/routes";
import { ApiError } from "#/api/types/errors";
import type { DetailField } from "#/components/ResourceDetail";
import { ResourceDetail } from "#/components/ResourceDetail";
import { toast } from "#/components/Toast";

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
		{ label: "Name", value: route.name },
		{
			label: "Pool",
			value: (
				<Link to="/pools" className="text-blue-600 hover:underline">
					{route.pool}
				</Link>
			),
		},
		{
			label: "ACL",
			value: (
				<pre className="whitespace-pre-wrap font-mono text-xs">{route.acl}</pre>
			),
		},
	];

	async function handleDelete() {
		try {
			await deleteRoute.mutateAsync(name);
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
			title={route.name}
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
			fallback={
				<div className="text-gray-500 dark:text-zinc-400 text-sm">Loading…</div>
			}
		>
			<RouteDetailInner />
		</Suspense>
	);
}
