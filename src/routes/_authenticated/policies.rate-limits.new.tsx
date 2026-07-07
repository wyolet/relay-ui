import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { proxyModeQueryOptions } from "@/api/hooks/settings";
import { RateLimitForm } from "@/rate-limits/RateLimitForm";
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
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					New rate limit
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Define rules and a window. Attach to policies or models afterward.
				</p>
			</div>
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
