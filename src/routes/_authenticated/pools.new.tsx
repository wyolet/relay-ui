import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { PoolForm } from "@/pools/PoolForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
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
		<div>
			<PageHeader
				back={
					<BackLink to="/keys" search={{ tab: "pools" }}>
						Pools
					</BackLink>
				}
				title="New pool"
				description="Order credentials at one host; link the pool from a policy to route through it."
			/>
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
