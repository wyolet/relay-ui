import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import {
	rateLimitDetailQueryOptions,
	rateLimitsListQueryOptions,
	useDeleteRateLimit,
	useRateLimit,
	useUpdateRateLimit,
} from "@/api/hooks/ratelimits";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { RateLimitDetailView } from "@/rate-limits/RateLimitDetailView";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export const Route = createFileRoute(
	"/_authenticated/policies/rate-limits/$name",
)({
	loader: ({ context, params }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(hostsListQueryOptions);
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(providersListQueryOptions);
		void queryClient.prefetchQuery(bindingsListQueryOptions);
		void queryClient.prefetchQuery(keysListQueryOptions);
		return Promise.all([
			queryClient.ensureQueryData(rateLimitDetailQueryOptions(params.name)),
			queryClient.ensureQueryData(policiesListQueryOptions),
		]);
	},
	component: RateLimitDetailPage,
});

function RateLimitDetailInner() {
	const { name } = Route.useParams();
	const navigate = useNavigate({ from: "/policies/rate-limits/$name" });
	const { data: rateLimit } = useRateLimit(name);
	const del = useConfirmedDelete(useDeleteRateLimit(), {
		noun: "rate limit",
		onDeleted: () =>
			void navigate({ to: "/policies", search: { tab: "ratelimits" } }),
	});
	const updateRL = useUpdateRateLimit();
	const toastSaveError = useSaveErrorToast();

	async function handleToggleEnabled() {
		const next = !(rateLimit.spec.enabled !== false);
		try {
			await updateRL.mutateAsync({
				id: rateLimit.metadata.id ?? "",
				body: { ...rateLimit, spec: { ...rateLimit.spec, enabled: next } },
			});
			toast("success", next ? "Rate limit enabled." : "Rate limit disabled.");
		} catch (err) {
			toastSaveError(err, "Failed to toggle rate limit.");
		}
	}

	return (
		<div>
			<RateLimitDetailView
				rateLimit={rateLimit}
				onDelete={() =>
					del.request({
						id: rateLimit.metadata.id ?? "",
						name: rateLimit.metadata.name,
						label: displayLabel(rateLimit.metadata),
					})
				}
				onToggleEnabled={() => void handleToggleEnabled()}
				deleting={del.isPending}
				toggling={updateRL.isPending}
			/>
			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
			)}
		</div>
	);
}

function RateLimitDetailPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<RateLimitDetailInner />
		</Suspense>
	);
}
