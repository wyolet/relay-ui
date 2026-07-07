import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HostKeysTable } from "@/host-keys/HostKeysTable";
import { RelayKeysTable } from "@/relay-keys/RelayKeysTable";
import { PageLoader } from "@/shared/Spinner";

type Tab = "relay" | "provider";

const searchSchema = z.object({
	tab: z.enum(["relay", "provider"]).default("relay"),
	q: z.string().default(""),
});

export const Route = createFileRoute("/_authenticated/keys")({
	validateSearch: searchSchema,
	loader: ({ context }) => {
		void context.queryClient.prefetchQuery(policiesListQueryOptions);
		void context.queryClient.prefetchQuery(hostKeysListQueryOptions);
		void context.queryClient.prefetchQuery(hostsListQueryOptions);
		void context.queryClient.prefetchQuery(relayKeysListQueryOptions);
		void context.queryClient.prefetchQuery(modelsListQueryOptions);
		void context.queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void context.queryClient.prefetchQuery(providersListQueryOptions);
		void context.queryClient.prefetchQuery(bindingsListQueryOptions);
		return null;
	},
	component: KeysPage,
});

function KeysPage() {
	const navigate = useNavigate({ from: "/keys" });
	const search = Route.useSearch();

	function setTab(tab: Tab) {
		void navigate({ search: (prev) => ({ ...prev, tab }) });
	}

	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">Keys</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					Relay API keys and the upstream provider credentials they draw from.
				</p>
			</div>

			<Tabs
				value={search.tab}
				onValueChange={(v) => setTab((v ?? "relay") as Tab)}
				className="mb-4"
			>
				<TabsList variant="underline">
					<TabsTrigger value="relay" className="px-3 h-9">
						Relay keys
					</TabsTrigger>
					<TabsTrigger value="provider" className="px-3 h-9">
						Credentials
					</TabsTrigger>
				</TabsList>
			</Tabs>

			{search.tab === "relay" && (
				<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
					<RelayKeysTable />
				</Suspense>
			)}
			{search.tab === "provider" && (
				<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
					<HostKeysTable />
				</Suspense>
			)}
		</div>
	);
}
