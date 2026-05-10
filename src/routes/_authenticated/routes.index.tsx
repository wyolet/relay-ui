import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { routesListQueryOptions, useRoutes } from "@/api/hooks/routes";
import type { RelayRoute } from "@/api/types/route";
import type { ColumnDef } from "@/components/ResourceList";
import { ResourceList } from "@/components/ResourceList";

export const Route = createFileRoute("/_authenticated/routes/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(routesListQueryOptions),
	component: RoutesPage,
});

const COLUMNS: ColumnDef<RelayRoute>[] = [
	{ key: "name", label: "Name", render: (r) => r.metadata.name },
	{
		key: "models",
		label: "Models",
		render: (r) => (r.spec.models ?? []).join(", ") || "—",
	},
	{
		key: "default",
		label: "Default",
		render: (r) => (r.spec.default ? "Yes" : "No"),
	},
];

function RoutesList() {
	const { data } = useRoutes();
	return (
		<ResourceList
			title="Routes"
			items={data.items ?? []}
			columns={COLUMNS}
			createTo="/routes/new"
			detailTo={(name) => `/routes/${name}`}
			getName={(r) => r.metadata.name}
			emptyMessage="No routes configured."
		/>
	);
}

function RoutesPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<RoutesList />
		</Suspense>
	);
}
