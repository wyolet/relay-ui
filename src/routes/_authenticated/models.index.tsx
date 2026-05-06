import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { modelsListQueryOptions, useModels } from "#/api/hooks/models";
import type { Model } from "#/api/types/model";
import type { ColumnDef } from "#/components/ResourceList";
import { ResourceList } from "#/components/ResourceList";

export const Route = createFileRoute("/_authenticated/models/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(modelsListQueryOptions),
	component: ModelsPage,
});

const COLUMNS: ColumnDef<Model>[] = [
	{ key: "name", label: "Name", render: (r) => r.name },
	{ key: "provider", label: "Provider", render: (r) => r.provider },
	{
		key: "upstream_name",
		label: "Upstream Name",
		render: (r) => r.upstream_name,
	},
	{
		key: "capabilities",
		label: "Capabilities",
		render: (r) => r.capabilities.join(", "),
	},
];

function ModelsList() {
	const { data } = useModels();
	return (
		<ResourceList
			title="Models"
			items={data.items}
			columns={COLUMNS}
			createTo="/models/new"
			detailTo={(name) => `/models/${name}`}
			emptyMessage="No models configured."
		/>
	);
}

function ModelsPage() {
	return (
		<Suspense fallback={<div className="text-gray-500 text-sm">Loading…</div>}>
			<ModelsList />
		</Suspense>
	);
}
