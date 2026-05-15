import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Trash2 } from "lucide-react";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
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
} from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { proxyModeQueryOptions } from "@/api/hooks/settings";
import { ApiError } from "@/api/types/errors";
import { confirm } from "@/components/ConfirmDialog";
import { RateLimitForm } from "@/components/RateLimitForm";
import { toast } from "@/components/Toast";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useRateLimitDiagnostics } from "@/diagnostics/useDiagnostics";

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
	component: RateLimitEditPage,
});

function RateLimitEditInner() {
	const { name } = Route.useParams();
	const navigate = useNavigate({ from: "/policies/rate-limits/$name" });
	const { data: rateLimit } = useRateLimit(name);
	const deleteRL = useDeleteRateLimit();
	const diagnostics = useRateLimitDiagnostics(rateLimit.metadata.id);

	const back = () =>
		void navigate({ to: "/policies", search: { tab: "ratelimits" } });

	async function handleDelete() {
		const ok = await confirm({
			title: `Delete rate limit ${name}?`,
			description: "Policies and models that reference it will lose this rule.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteRL.mutateAsync(rateLimit.metadata.id ?? "");
			toast("success", `Rate limit "${displayLabel(rateLimit.metadata)}" deleted.`);
			back();
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete rate limit.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/policies"
					search={{ tab: "ratelimits" }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Rate limits
				</Link>
				<div className="mt-2 flex items-start justify-between gap-4">
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate">
							{displayLabel(rateLimit.metadata)}
							{!hasDisplayName(rateLimit.metadata) && (
								<span className="ml-1.5 text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
						</h1>
						<div className="mt-1 text-xs text-muted-foreground">
							{rateLimit.spec.rules?.[0]?.strategy ?? "no strategy"} ·{" "}
							{rateLimit.spec.rules?.[0]
								? `${Math.round(rateLimit.spec.rules[0].window / 1_000_000_000)}s window · `
								: ""}
							{rateLimit.spec.rules?.length ?? 0} rule
							{rateLimit.spec.rules?.length === 1 ? "" : "s"}
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={() => void handleDelete()}
							disabled={deleteRL.isPending}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-destructive border border-border hover:bg-destructive/10 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
						>
							<Trash2 className="w-3.5 h-3.5" />
							Delete
						</button>
					</div>
				</div>
			</div>

			<DiagnosticList diagnostics={diagnostics} />

			<RateLimitForm rateLimit={rateLimit} onSaved={back} onCancel={back} />
		</div>
	);
}

function RateLimitEditPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<RateLimitEditInner />
		</Suspense>
	);
}
