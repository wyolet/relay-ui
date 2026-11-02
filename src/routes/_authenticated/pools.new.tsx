import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { PoolForm } from "@/pools/PoolForm";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/pools/new")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
		]),
	component: NewPoolPage,
});

function NewPoolPage() {
	const navigate = useNavigate();
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/keys"
					search={{ tab: "pools" }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Pools
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">New pool</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Order credentials at one host; link the pool from a policy to route
					through it.
				</p>
			</div>
			<Suspense fallback={<PageLoader />}>
				<PoolForm
					onSaved={(name) =>
						void navigate({ to: "/pools/$name", params: { name } })
					}
					onCancel={() =>
						void navigate({ to: "/keys", search: { tab: "pools" } })
					}
				/>
			</Suspense>
		</div>
	);
}
