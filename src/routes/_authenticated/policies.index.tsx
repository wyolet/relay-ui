import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PoliciesTable } from "@/policies/PoliciesTable";
import { RateLimitsTable } from "@/rate-limits/RateLimitsTable";
import { PageLoader } from "@/shared/Spinner";

type Tab = "policies" | "ratelimits";

const searchSchema = z.object({
	tab: z.enum(["policies", "ratelimits"]).default("policies"),
});

export const Route = createFileRoute("/_authenticated/policies/")({
	validateSearch: searchSchema,
	loader: ({ context }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(hostsListQueryOptions);
		void queryClient.prefetchQuery(bindingsListQueryOptions);
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(relayKeysListQueryOptions);
		void queryClient.prefetchQuery(providersListQueryOptions);
		return Promise.all([
			queryClient.ensureQueryData(policiesListQueryOptions),
			queryClient.ensureQueryData(rateLimitsListQueryOptions),
			queryClient.ensureQueryData(governanceQueryOptions("policy")),
		]);
	},
	component: PoliciesPage,
});

function PoliciesPage() {
	const navigate = useNavigate({ from: "/policies" });
	const search = Route.useSearch();

	function setTab(tab: Tab) {
		void navigate({ search: (prev) => ({ ...prev, tab }) });
	}

	return (
		<Suspense fallback={<PageLoader />}>
			<div>
				<div className="mb-4 flex items-start gap-2">
					<div>
						<h1 className="text-lg font-semibold text-foreground">Policies</h1>
						<p className="text-xs text-muted-foreground mt-0.5">
							Bundle upstream credentials, allowed models, and rate limits, then
							attach to relay keys.
						</p>
					</div>
				</div>
				<Tabs
					value={search.tab}
					onValueChange={(v) => setTab((v ?? "policies") as Tab)}
					className="mb-4"
				>
					<TabsList variant="underline">
						<TabsTrigger value="policies" className="px-3 h-9">
							Policies
						</TabsTrigger>
						<TabsTrigger value="ratelimits" className="px-3 h-9">
							Rate limits
						</TabsTrigger>
					</TabsList>
				</Tabs>
				{search.tab === "policies" && <PoliciesTable />}
				{search.tab === "ratelimits" && <RateLimitsTable />}
			</div>
		</Suspense>
	);
}
