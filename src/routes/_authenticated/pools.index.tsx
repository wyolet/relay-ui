import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { poolsListQueryOptions, usePools } from "#/api/hooks/pools";
import type { Pool } from "#/api/types/pool";
import type { ColumnDef } from "#/components/ResourceList";
import { ResourceList } from "#/components/ResourceList";

export const Route = createFileRoute("/_authenticated/pools/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(poolsListQueryOptions),
	component: PoolsPage,
});

const COLUMNS: ColumnDef<Pool>[] = [
	{ key: "name", label: "Name", render: (r) => r.metadata.name },
	{ key: "provider", label: "Provider", render: (r) => r.spec.provider },
	{
		key: "secrets",
		label: "Secrets",
		render: (r) => r.spec.secrets.length,
	},
	{
		key: "default",
		label: "Default",
		render: (r) => (r.spec.default ? "Yes" : "No"),
	},
	{
		key: "health",
		label: "Health",
		// TODO: replace with real health from /admin/keypool/:pool/health when available
		render: (_r) => "ok",
		sortable: false,
	},
];

function PoolsList() {
	const { data } = usePools();
	return (
		<ResourceList
			title="Pools"
			items={data.items}
			columns={COLUMNS}
			createTo="/pools/new"
			detailTo={(name) => `/pools/${name}`}
			getName={(r) => r.metadata.name}
			emptyMessage="No pools configured."
		/>
	);
}

function PoolsPage() {
	return (
		<Suspense
			fallback={
				<div className="text-gray-500 dark:text-zinc-400 text-sm">Loading…</div>
			}
		>
			<PoolsList />
		</Suspense>
	);
}
