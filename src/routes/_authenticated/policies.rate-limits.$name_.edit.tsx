import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
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
	useRateLimit,
} from "@/api/hooks/ratelimits";
import { proxyModeQueryOptions } from "@/api/hooks/settings";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useRateLimitDiagnostics } from "@/diagnostics/useDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { RateLimitForm } from "@/rate-limits/RateLimitForm";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute(
	"/_authenticated/policies/rate-limits/$name_/edit",
)({
	loader: ({ context, params }) => {
		const { queryClient } = context;
		// rateLimits + bindings feed the DiagnosticList this edit view renders
		// (non-blocking now); warm them alongside the form pickers.
		void queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void queryClient.prefetchQuery(policiesListQueryOptions);
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(hostsListQueryOptions);
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(keysListQueryOptions);
		void queryClient.prefetchQuery(providersListQueryOptions);
		void queryClient.prefetchQuery(bindingsListQueryOptions);
		return Promise.all([
			queryClient.ensureQueryData(rateLimitDetailQueryOptions(params.name)),
			queryClient.ensureQueryData(proxyModeQueryOptions),
		]);
	},
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
