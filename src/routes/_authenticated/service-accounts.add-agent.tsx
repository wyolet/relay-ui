import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { AddAgent } from "@/agents/AddAgent";
import { catalogGraphQueryOptions } from "@/api/hooks/catalog";
import { myContextsQueryOptions } from "@/api/hooks/contexts";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute(
	"/_authenticated/service-accounts/add-agent",
)({
	loader: ({ context }) => {
		void context.queryClient.prefetchQuery(
			catalogGraphQueryOptions({ includeDeprecated: true }),
		);
		return context.queryClient.ensureQueryData(myContextsQueryOptions);
	},
	component: AddAgentPage,
});

function AddAgentPage() {
	const navigate = useNavigate();
	return (
		<div className="flex flex-col gap-6">
			<div>
				<Link
					to="/service-accounts"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Service accounts
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Add agent
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					A service account, what it may use, and a key for it, in one pass.
				</p>
			</div>
			<Suspense fallback={<PageLoader />}>
				<AddAgent onCancel={() => void navigate({ to: "/service-accounts" })} />
			</Suspense>
		</div>
	);
}
