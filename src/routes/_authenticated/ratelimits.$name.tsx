import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import {
	rateLimitDetailQueryOptions,
	useDeleteRateLimit,
	useRateLimit,
} from "#/api/hooks/ratelimits";
import { ApiError } from "#/api/types/errors";
import type { DetailField } from "#/components/ResourceDetail";
import { ResourceDetail } from "#/components/ResourceDetail";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/ratelimits/$name")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			rateLimitDetailQueryOptions(params.name),
		),
	component: RateLimitDetailPage,
});

function RateLimitDetailInner() {
	const { name } = Route.useParams();
	const { data: rl } = useRateLimit(name);
	const deleteRateLimit = useDeleteRateLimit();
	const navigate = useNavigate();

	const fields: DetailField[] = [
		{ label: "Name", value: rl.name },
		{ label: "Strategy", value: rl.strategy },
		{ label: "Window", value: `${rl.window}s` },
		{ label: "Amount", value: rl.amount },
		{ label: "Source", value: rl.source },
	];

	async function handleDelete() {
		try {
			await deleteRateLimit.mutateAsync(name);
			toast("success", `Rate limit "${name}" deleted.`);
			void navigate({ to: "/ratelimits" });
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to delete rate limit.");
			}
		}
	}

	return (
		<ResourceDetail
			title={rl.name}
			fields={fields}
			editTo={`/ratelimits/${name}/edit`}
			backTo="/ratelimits"
			backLabel="Rate Limits"
			onDelete={handleDelete}
			isDeleting={deleteRateLimit.isPending}
		/>
	);
}

function RateLimitDetailPage() {
	return (
		<Suspense fallback={<div className="text-gray-500 text-sm">Loading…</div>}>
			<RateLimitDetailInner />
		</Suspense>
	);
}
