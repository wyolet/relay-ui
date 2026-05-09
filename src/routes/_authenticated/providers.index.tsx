import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { providersListQueryOptions, useProviders } from "@/api/hooks/providers";
import type { Provider } from "@/api/types/provider";
import type { ColumnDef } from "@/components/ResourceList";
import { ResourceList } from "@/components/ResourceList";

export const Route = createFileRoute("/_authenticated/providers/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(providersListQueryOptions),
	component: ProvidersPage,
});

const COLUMNS: ColumnDef<Provider>[] = [
	{ key: "name", label: "Name", render: (r) => r.metadata.name },
	{ key: "kind", label: "Kind", render: (r) => r.spec.kind },
	{ key: "baseURL", label: "Base URL", render: (r) => r.spec.baseURL },
	{
		key: "default",
		label: "Default",
		render: (r) => (r.spec.default ? "Yes" : "No"),
	},
];

function ProvidersList() {
	const { data } = useProviders();
	return (
		<ResourceList
			title="Providers"
			items={data.items ?? []}
			columns={COLUMNS}
			createTo="/providers/new"
			detailTo={(name) => `/providers/${name}`}
			getName={(r) => r.metadata.name}
			emptyMessage="No providers configured."
		/>
	);
}

function ProvidersPage() {
	return (
		<Suspense
			fallback={
				<div className="text-muted-foreground text-sm">Loading…</div>
			}
		>
			<ProvidersList />
		</Suspense>
	);
}
