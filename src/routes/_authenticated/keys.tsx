import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { AccountsTable } from "@/accounts/AccountsTable";
import {
	accountListQueryOptions,
	myAccountsQueryOptions,
} from "@/api/hooks/accounts";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { keysListQuery, keysListQueryOptions } from "@/api/hooks/keys";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { poolListQueryOptions } from "@/api/hooks/pools";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { serviceAccountsListQueryOptions } from "@/api/hooks/serviceAccounts";
import { usersListQueryOptions } from "@/api/hooks/users";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeysTable, toKeysParams } from "@/keys/KeysTable";
import { PoolsTable } from "@/pools/PoolsTable";
import { PageLoader } from "@/shared/Spinner";

const TABS = ["relay", "accounts", "pools"] as const;

const searchSchema = z.object({
	// Credentials live in their accounts now; the old tab lands there.
	tab: z
		.enum(TABS)
		.catch(({ input }) => (input === "provider" ? "accounts" : "relay"))
		.default("relay"),
	q: z.string().default(""),
	principal_kind: z
		.enum(["all", "serviceaccount", "user"])
		.catch("all")
		.default("all"),
	principal_id: z.string().catch("").default(""),
	expired: z.enum(["all", "true", "false"]).catch("all").default("all"),
	// The accounts tab's "Mine" filter.
	mine: z.boolean().catch(false).default(false),
});

export const Route = createFileRoute("/_authenticated/keys")({
	validateSearch: searchSchema,
	// Defaults stay out of the URL.
	search: { middlewares: [stripSearchParams(searchSchema.parse({}))] },
	loaderDeps: ({ search }) => ({
		q: search.q,
		principal_kind: search.principal_kind,
		principal_id: search.principal_id,
		expired: search.expired,
	}),
	loader: ({ context, deps }) => {
		void context.queryClient.prefetchQuery(policiesListQueryOptions);
		void context.queryClient.prefetchQuery(hostKeysListQueryOptions);
		void context.queryClient.prefetchQuery(hostsListQueryOptions);
		void context.queryClient.prefetchQuery(keysListQueryOptions);
		void context.queryClient.prefetchQuery(serviceAccountsListQueryOptions);
		void context.queryClient.ensureQueryData(keysListQuery(toKeysParams(deps)));
		void context.queryClient.prefetchQuery(modelsListQueryOptions);
		void context.queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void context.queryClient.prefetchQuery(providersListQueryOptions);
		void context.queryClient.prefetchQuery(bindingsListQueryOptions);
		void context.queryClient.prefetchQuery(accountListQueryOptions);
		void context.queryClient.prefetchQuery(myAccountsQueryOptions);
		void context.queryClient.prefetchQuery(usersListQueryOptions);
		void context.queryClient.prefetchQuery(poolListQueryOptions);
		return null;
	},
	component: KeysPage,
});

function KeysPage() {
	const navigate = useNavigate({ from: "/keys" });
	const search = Route.useSearch();

	function setTab(value: unknown) {
		const tab = TABS.find((t) => t === value) ?? "relay";
		// "Mine" belongs to the Accounts tab; leaving it resets the filter.
		void navigate({ search: (prev) => ({ ...prev, tab, mine: false }) });
	}

	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">Keys</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					Relay API keys, and the provider accounts and pools whose keys they
					draw on.
				</p>
			</div>

			<Tabs value={search.tab} onValueChange={setTab} className="mb-4">
				<TabsList variant="underline">
					<TabsTrigger value="relay" className="px-3 h-9">
						API keys
					</TabsTrigger>
					<TabsTrigger value="accounts" className="px-3 h-9">
						Accounts
					</TabsTrigger>
					<TabsTrigger value="pools" className="px-3 h-9">
						Pools
					</TabsTrigger>
				</TabsList>
			</Tabs>

			{search.tab === "relay" && (
				<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
					<KeysTable />
				</Suspense>
			)}
			{search.tab === "accounts" && (
				<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
					<AccountsTable />
				</Suspense>
			)}
			{search.tab === "pools" && (
				<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
					<PoolsTable />
				</Suspense>
			)}
		</div>
	);
}
