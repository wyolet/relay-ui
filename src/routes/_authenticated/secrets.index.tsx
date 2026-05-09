import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { poolsListQueryOptions, usePools } from "@/api/hooks/pools";
import { secretsListQueryOptions, useSecrets } from "@/api/hooks/secrets";
import type { SecretResponse } from "@/api/types/secret";
import type { ColumnDef } from "@/components/ResourceList";
import { ResourceList } from "@/components/ResourceList";

export const Route = createFileRoute("/_authenticated/secrets/")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(secretsListQueryOptions),
			context.queryClient.ensureQueryData(poolsListQueryOptions),
		]),
	component: SecretsPage,
});

/** Row shape for the list — augmented with reference count. */
interface SecretRow extends SecretResponse {
	refCount: number;
}

function SecretsList() {
	const { data: secretsData } = useSecrets();
	const { data: poolsData } = usePools();

	const rows: SecretRow[] = (secretsData.items ?? []).map((secret) => ({
		...secret,
		refCount: (poolsData.items ?? []).filter((pool) =>
			(pool.spec.secrets ?? []).includes(secret.name),
		).length,
	}));

	const COLUMNS: ColumnDef<SecretRow>[] = [
		{ key: "name", label: "Name", render: (r) => r.name },
		{
			key: "kind",
			label: "Kind",
			render: (r) => r.valueFrom.kind,
		},
		{
			key: "value",
			label: "Value / Env Var",
			render: (r) =>
				r.valueFrom.kind === "stored"
					? (r.valueFrom.value_masked ?? "—")
					: (r.valueFrom.env ?? "—"),
		},
		{
			key: "refCount",
			label: "References",
			render: (r) => r.refCount,
		},
	];

	return (
		<ResourceList
			title="Secrets"
			items={rows}
			columns={COLUMNS}
			createTo="/secrets/new"
			detailTo={(name) => `/secrets/${name}`}
			getName={(r) => r.name}
			emptyMessage="No secrets configured."
		/>
	);
}

function SecretsPage() {
	return (
		<Suspense
			fallback={
				<div className="text-muted-foreground text-sm">Loading…</div>
			}
		>
			<SecretsList />
		</Suspense>
	);
}
