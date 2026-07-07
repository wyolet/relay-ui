import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import {
	relayKeyDetailQueryOptions,
	relayKeysListQueryOptions,
} from "@/api/hooks/relayKeys";
import { RelayKeyDetailView } from "@/relay-keys/RelayKeyDetailView";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/relay-keys/$name")({
	loader: ({ context, params }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(relayKeysListQueryOptions);
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(hostsListQueryOptions);
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void queryClient.prefetchQuery(providersListQueryOptions);
		void queryClient.prefetchQuery(bindingsListQueryOptions);
		return Promise.all([
			queryClient.ensureQueryData(relayKeyDetailQueryOptions(params.name)),
			queryClient.ensureQueryData(policiesListQueryOptions),
		]);
	},
	component: RelayKeyDetailPage,
});

function RelayKeyDetailPage() {
	const { name } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<RelayKeyDetailView name={name} />
		</Suspense>
	);
}
