import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { proxyModeQueryOptions } from "@/api/hooks/settings";
import { RateLimitForm } from "@/rate-limits/RateLimitForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute(
	"/_authenticated/policies/rate-limits/new",
)({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(proxyModeQueryOptions),
	component: NewRateLimitPage,
});

function NewRateLimitInner() {
	const navigate = useNavigate();
	const back = () =>
		void navigate({ to: "/policies", search: { tab: "ratelimits" } });
	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/policies" search={{ tab: "ratelimits" }}>
						Rate limits
					</BackLink>
				}
				title="New rate limit"
				description="Define rules and a window. Attach to policies or models afterward."
			/>
			<RateLimitForm onSaved={back} onCancel={back} />
		</div>
	);
}

function NewRateLimitPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<NewRateLimitInner />
		</Suspense>
	);
}
