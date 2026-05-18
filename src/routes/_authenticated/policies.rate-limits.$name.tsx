import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
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
import { proxyModeQueryOptions } from "@/api/hooks/settings";
import { ApiError } from "@/api/types/errors";
import { displayLabel } from "@/lib/displayLabel";
import { RateLimitDetailView } from "@/rate-limits/RateLimitDetailView";
import { confirm } from "@/shared/ConfirmDialog";
import { toast } from "@/shared/Toast";

export const Route = createFileRoute(
	"/_authenticated/policies/rate-limits/$name",
)({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				rateLimitDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(proxyModeQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(relayKeysListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
		]),
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
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<RateLimitDetailInner />
		</Suspense>
	);
}
