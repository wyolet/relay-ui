import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { myContextsQueryOptions } from "@/api/hooks/contexts";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { Byok } from "@/byok/Byok";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/host-keys/byok")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(myContextsQueryOptions),
		]),
	component: ByokPage,
});

function ByokPage() {
	const navigate = useNavigate();
	return (
		<div className="flex flex-col gap-6">
			<div>
				<Link
					to="/accounts"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Accounts
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Bring your own key
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					A provider key, the account it belongs to, and who may use it, in one
					pass.
				</p>
			</div>
			<Suspense fallback={<PageLoader />}>
				<Byok onCancel={() => void navigate({ to: "/accounts" })} />
			</Suspense>
		</div>
	);
}
