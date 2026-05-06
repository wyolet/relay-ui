import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { routesListQueryOptions, useRoutes } from "#/api/hooks/routes";
import type { RelayRoute } from "#/api/types/route";
import type { ColumnDef } from "#/components/ResourceList";
import { ResourceList } from "#/components/ResourceList";

export const Route = createFileRoute("/_authenticated/routes/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(routesListQueryOptions),
	component: RoutesPage,
});

const COLUMNS: ColumnDef<RelayRoute>[] = [
	{ key: "name", label: "Name", render: (r) => r.name },
	{ key: "pool", label: "Pool", render: (r) => r.pool },
	{
		key: "acl",
		label: "ACL (preview)",
		render: (r) => r.acl.split("\n")[0] ?? "",
	},
];

function RoutesList() {
	const { data } = useRoutes();
	return (
		<ResourceList
			title="Routes"
			items={data.items}
			columns={COLUMNS}
			createTo="/routes/new"
			detailTo={(name) => `/routes/${name}`}
			emptyMessage="No routes configured."
		/>
	);
}

function RoutesPage() {
	return (
		<Suspense fallback={<div className="text-gray-500 text-sm">Loading…</div>}>
			<RoutesList />
		</Suspense>
	);
}
