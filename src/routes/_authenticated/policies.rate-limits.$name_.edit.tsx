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
	useRateLimit,
} from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { proxyModeQueryOptions } from "@/api/hooks/settings";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useRateLimitDiagnostics } from "@/diagnostics/useDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { RateLimitForm } from "@/rate-limits/RateLimitForm";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute(
	"/_authenticated/policies/rate-limits/$name_/edit",
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
	const navigate = useNavigate({ from: "/policies/rate-limits/$name/edit" });
	const { data: rateLimit } = useRateLimit(name);
	const diagnostics = useRateLimitDiagnostics(rateLimit.metadata.id);

	const back = () =>
		void navigate({
			to: "/policies/rate-limits/$name",
			params: { name },
		});

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/policies/rate-limits/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(rateLimit.metadata)}
				</Link>
				<div className="mt-2">
					<h1 className="text-xl font-semibold text-foreground truncate">
						Edit {displayLabel(rateLimit.metadata)}
						{!hasDisplayName(rateLimit.metadata) && (
							<span className="ml-1.5 text-[11px] text-muted-foreground font-normal">
								(no display name)
							</span>
						)}
					</h1>
				</div>
			</div>

			<DiagnosticList diagnostics={diagnostics} />

			<RateLimitForm rateLimit={rateLimit} onSaved={back} onCancel={back} />
		</div>
	);
}

function RateLimitEditPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<RateLimitEditInner />
		</Suspense>
	);
}
