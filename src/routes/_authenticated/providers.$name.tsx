import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import {
	providerDetailQueryOptions,
	useDeleteProvider,
	useProvider,
} from "#/api/hooks/providers";
import { ApiError } from "#/api/types/errors";
import type { DetailField } from "#/components/ResourceDetail";
import { ResourceDetail } from "#/components/ResourceDetail";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/providers/$name")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			providerDetailQueryOptions(params.name),
		),
	component: ProviderDetailPage,
});

function ProviderDetailInner() {
	const { name } = Route.useParams();
	const { data: provider } = useProvider(name);
	const deleteProvider = useDeleteProvider();
	const navigate = useNavigate();

	const fields: DetailField[] = [
		{ label: "Name", value: provider.metadata.name },
		{ label: "Kind", value: provider.spec.kind },
		{ label: "Base URL", value: provider.spec.baseURL },
		{ label: "Default", value: provider.spec.default ? "Yes" : "No" },
		{ label: "Default Pool", value: provider.spec.defaultPool ?? "—" },
	];

	async function handleDelete() {
		try {
			await deleteProvider.mutateAsync(name);
			toast("success", `Provider "${name}" deleted.`);
			void navigate({ to: "/providers" });
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to delete provider.");
			}
		}
	}

	return (
		<ResourceDetail
			title={provider.metadata.name}
			fields={fields}
			editTo={`/providers/${name}/edit`}
			backTo="/providers"
			backLabel="Providers"
			onDelete={handleDelete}
			isDeleting={deleteProvider.isPending}
		/>
	);
}

function ProviderDetailPage() {
	return (
		<Suspense
			fallback={
				<div className="text-gray-500 dark:text-zinc-400 text-sm">Loading…</div>
			}
		>
			<ProviderDetailInner />
		</Suspense>
	);
}
