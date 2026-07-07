import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
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
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import { displayLabel } from "@/lib/displayLabel";
import { RateLimitDetailView } from "@/rate-limits/RateLimitDetailView";
import { confirm } from "@/shared/ConfirmDialog";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";

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
		return Promise.all([
			queryClient.ensureQueryData(rateLimitDetailQueryOptions(params.name)),
			queryClient.ensureQueryData(policiesListQueryOptions),
			queryClient.ensureQueryData(relayKeysListQueryOptions),
		]);
	},
	component: RateLimitDetailPage,
});

function RateLimitDetailInner() {
	const { name } = Route.useParams();
	const navigate = useNavigate({ from: "/policies/rate-limits/$name" });
	const { data: rateLimit } = useRateLimit(name);
	const deleteRL = useDeleteRateLimit();
	const updateRL = useUpdateRateLimit(rateLimit.metadata.id ?? "");

	async function handleDelete() {
		const ok = await confirm({
			title: `Delete rate limit ${name}?`,
			description: "Policies that reference it will lose this rule.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteRL.mutateAsync(rateLimit.metadata.id ?? "");
			toast(
				"success",
				`Rate limit "${displayLabel(rateLimit.metadata)}" deleted.`,
			);
			void navigate({ to: "/policies", search: { tab: "ratelimits" } });
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete rate limit.",
			);
		}
	}

	async function handleToggleEnabled() {
		const next = !(rateLimit.spec.enabled !== false);
		try {
			await updateRL.mutateAsync({
				...rateLimit,
				spec: { ...rateLimit.spec, enabled: next },
			});
			toast("success", next ? "Rate limit enabled." : "Rate limit disabled.");
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to toggle rate limit.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<Link
				to="/policies"
				search={{ tab: "ratelimits" }}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Rate limits
			</Link>
			<RateLimitDetailView
				rateLimit={rateLimit}
				onDelete={() => void handleDelete()}
				onToggleEnabled={() => void handleToggleEnabled()}
				deleting={deleteRL.isPending}
				toggling={updateRL.isPending}
			/>
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
