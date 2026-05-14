import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { hostKeysListQueryOptions, useHostKeys } from "@/api/hooks/hostkeys";
import { policiesListQueryOptions, usePolicies } from "@/api/hooks/policies";
import type { HostKey } from "@/api/types/hostkey";
import type { ColumnDef } from "@/components/ResourceList";
import { ResourceList } from "@/components/ResourceList";

export const Route = createFileRoute("/_authenticated/host-keys/")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
		]),
	component: HostKeysPage,
});

interface HostKeyRow {
	hk: HostKey;
	refCount: number;
}

function HostKeysList() {
	const { data: hostKeysData } = useHostKeys();
	const { data: policiesData } = usePolicies();

	const rows: HostKeyRow[] = (hostKeysData.items ?? []).map((hk) => ({
		hk,
		refCount: (policiesData.items ?? []).filter((policy) =>
			(policy.spec.hostKeyIds ?? []).includes(hk.metadata.id ?? ""),
		).length,
	}));

	const COLUMNS: ColumnDef<HostKeyRow>[] = [
		{ key: "name", label: "Name", render: (r) => r.hk.metadata.name },
		{
			key: "kind",
			label: "Kind",
			render: (r) => r.hk.spec.valueFrom.kind,
		},
		{
			key: "value",
			label: "Value / Env Var",
			render: (r) => r.hk.spec.valueFrom.env ?? "—",
		},
		{
			key: "refCount",
			label: "References",
			render: (r) => r.refCount,
		},
	];

	return (
		<ResourceList
			title="Host Keys"
			items={rows}
			columns={COLUMNS}
			createTo="/host-keys/new"
			detailTo={(name) => `/host-keys/${name}`}
			getName={(r) => r.hk.metadata.name}
			emptyMessage="No host keys configured."
		/>
	);
}

function HostKeysPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<HostKeysList />
		</Suspense>
	);
}
