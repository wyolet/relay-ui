import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { budgetListQueryOptions } from "@/api/hooks/budgets";
import { useCapabilities } from "@/api/hooks/capabilities";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { policyBindingsListQuery } from "@/api/hooks/policyBindings";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { BudgetsTable } from "@/budgets/BudgetsTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PoliciesTable } from "@/policies/PoliciesTable";
import {
	PolicyBindingsTable,
	toPolicyBindingsParams,
} from "@/policy-bindings/PolicyBindingsTable";
import { RateLimitsTable } from "@/rate-limits/RateLimitsTable";
import { PageLoader } from "@/shared/Spinner";

const TABS = ["policies", "ratelimits", "budgets", "bindings"] as const;

const searchSchema = z.object({
	tab: z.enum(TABS).default("policies"),
	// The bindings tab's filters.
	q: z.string().default(""),
	project_id: z.string().catch("").default(""),
	policy: z.string().catch("").default(""),
	account: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/policies/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ ...search }),
	loader: ({ context, deps }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(hostsListQueryOptions);
		void queryClient.prefetchQuery(bindingsListQueryOptions);
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(keysListQueryOptions);
		void queryClient.prefetchQuery(providersListQueryOptions);
		void queryClient.prefetchQuery(budgetListQueryOptions);
		if (deps.tab === "bindings") {
			void queryClient.prefetchQuery(
				policyBindingsListQuery(toPolicyBindingsParams(deps)),
			);
			void queryClient.prefetchQuery(projectsListQueryOptions);
			void queryClient.prefetchQuery(accountListQueryOptions);
		}
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
	const canListBindings = useCapabilities()["policy-bindings"];

	function setTab(value: unknown) {
		const tab = TABS.find((t) => t === value) ?? "policies";
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
							bind them to accounts.
						</p>
					</div>
				</div>
				<Tabs value={search.tab} onValueChange={setTab} className="mb-4">
					<TabsList variant="underline">
						<TabsTrigger value="policies" className="px-3 h-9">
							Policies
						</TabsTrigger>
						<TabsTrigger value="ratelimits" className="px-3 h-9">
							Rate limits
						</TabsTrigger>
						<TabsTrigger value="budgets" className="px-3 h-9">
							Budgets
						</TabsTrigger>
						{canListBindings && (
							<TabsTrigger value="bindings" className="px-3 h-9">
								Bindings
							</TabsTrigger>
						)}
					</TabsList>
				</Tabs>
				{search.tab === "policies" && <PoliciesTable />}
				{search.tab === "ratelimits" && <RateLimitsTable />}
				{search.tab === "budgets" && (
					<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
						<BudgetsTable />
					</Suspense>
				)}
				{search.tab === "bindings" && (
					<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
						<PolicyBindingsTable />
					</Suspense>
				)}
			</div>
		</Suspense>
	);
}
