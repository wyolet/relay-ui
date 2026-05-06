import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { providersListQueryOptions, useProviders } from "#/api/hooks/providers";
import type { Provider } from "#/api/types/provider";
import type { ColumnDef } from "#/components/ResourceList";
import { ResourceList } from "#/components/ResourceList";

export const Route = createFileRoute("/_authenticated/providers/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(providersListQueryOptions),
	component: ProvidersPage,
});

const COLUMNS: ColumnDef<Provider>[] = [
	{ key: "name", label: "Name", render: (r) => r.name },
	{ key: "kind", label: "Kind", render: (r) => r.kind },
	{ key: "endpoint", label: "Endpoint", render: (r) => r.endpoint },
	{ key: "secret", label: "Secret", render: (r) => r.secret ?? "—" },
];

function ProvidersList() {
	const { data } = useProviders();
	return (
		<ResourceList
			title="Providers"
			items={data.items}
			columns={COLUMNS}
			createTo="/providers/new"
			detailTo={(name) => `/providers/${name}`}
			emptyMessage="No providers configured."
		/>
	);
}

function ProvidersPage() {
	return (
		<Suspense fallback={<div className="text-gray-500 text-sm">Loading…</div>}>
			<ProvidersList />
		</Suspense>
	);
}
