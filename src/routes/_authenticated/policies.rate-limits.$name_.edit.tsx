import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import {
	rateLimitDetailQueryOptions,
	rateLimitsListQueryOptions,
	useRateLimit,
} from "@/api/hooks/ratelimits";
import { proxyModeQueryOptions } from "@/api/hooks/settings";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { usePlanDiagnostics } from "@/diagnostics/usePlanDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { RateLimitForm } from "@/rate-limits/RateLimitForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute(
	"/_authenticated/policies/rate-limits/$name_/edit",
)({
	loader: ({ context, params }) => {
		const { queryClient } = context;
		// The form's system-limit lookup reads the full list.
		void queryClient.prefetchQuery(rateLimitsListQueryOptions);
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
	const diagnostics = usePlanDiagnostics("ratelimit", rateLimit.metadata.id);

	const back = () =>
		void navigate({
			to: "/policies/rate-limits/$name",
			params: { name },
		});

	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/policies/rate-limits/$name" params={{ name }}>
						{displayLabel(rateLimit.metadata)}
					</BackLink>
				}
				title={
					<>
						Edit {displayLabel(rateLimit.metadata)}
						{!hasDisplayName(rateLimit.metadata) && (
							<span className="ml-1.5 text-[11px] text-muted-foreground font-normal">
								(no display name)
							</span>
						)}
					</>
				}
			/>
			<div className="flex flex-col gap-4">
				<DiagnosticList diagnostics={diagnostics} />
				<RateLimitForm rateLimit={rateLimit} onSaved={back} onCancel={back} />
			</div>
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
