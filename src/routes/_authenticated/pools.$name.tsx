import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import {
	poolDetailQueryOptions,
	poolKeysQueryOptions,
} from "@/api/hooks/pools";
import { PoolDetailView } from "@/pools/PoolDetailView";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/pools/$name")({
	loader: ({ context, params }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(poolKeysQueryOptions(params.name));
		void queryClient.prefetchQuery(hostsListQueryOptions);
		return queryClient.ensureQueryData(poolDetailQueryOptions(params.name));
	},
	component: PoolDetailPage,
});

function PoolDetailPage() {
	const { name } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<PoolDetailView name={name} />
		</Suspense>
	);
}
