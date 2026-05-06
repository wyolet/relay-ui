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
	{ key: "name", label: "Name", render: (r) => r.metadata.name },
	{ key: "provider", label: "Provider", render: (r) => r.spec.provider },
	{
		key: "upstream_name",
		label: "Upstream Name",
		render: (r) => r.spec.upstream_name,
	},
	{
		key: "capabilities",
		label: "Capabilities",
		render: (r) => r.spec.capabilities.join(", "),
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
			getName={(r) => r.metadata.name}
			emptyMessage="No models configured."
		/>
	);
}

function ModelsPage() {
	return (
		<Suspense
			fallback={
				<div className="text-gray-500 dark:text-zinc-400 text-sm">Loading…</div>
			}
		>
			<ModelsList />
		</Suspense>
	);
}
