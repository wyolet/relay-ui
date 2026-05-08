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

function capabilitiesSummary(cap: Model["spec"]["capabilities"]): string {
	if (!cap) return "—";
	return (
		Object.entries(cap)
			.filter(([, v]) => v === true)
			.map(([k]) => k)
			.join(", ") || "—"
	);
}

const COLUMNS: ColumnDef<Model>[] = [
	{ key: "name", label: "Name", render: (r) => r.metadata.name },
	{ key: "provider", label: "Provider", render: (r) => r.spec.provider },
	{
		key: "upstreamName",
		label: "Upstream Name",
		render: (r) => r.spec.upstreamName,
	},
	{
		key: "capabilities",
		label: "Capabilities",
		render: (r) => capabilitiesSummary(r.spec.capabilities),
	},
];

function ModelsList() {
	const { data } = useModels();
	return (
		<ResourceList
			title="Models"
			items={data.items ?? []}
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
				<div className="text-neutral-500 dark:text-neutral-400 text-sm">Loading…</div>
			}
		>
			<ModelsList />
		</Suspense>
	);
}
