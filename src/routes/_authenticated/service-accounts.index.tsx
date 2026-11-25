import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { policyBindingsAllQueryOptions } from "@/api/hooks/policyBindings";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { serviceAccountsListQuery } from "@/api/hooks/serviceAccounts";
import { awaitOnEnter } from "@/lib/awaitOnEnter";
import {
	ServiceAccountsTable,
	toServiceAccountsParams,
} from "@/service-accounts/ServiceAccountsTable";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	q: z.string().default(""),
	enabled: z.enum(["all", "true", "false"]).catch("all").default("all"),
	project_id: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/service-accounts/")({
	validateSearch: searchSchema,
	search: { middlewares: [stripSearchParams(searchSchema.parse({}))] },
	loaderDeps: ({ search }) => ({
		q: search.q,
		enabled: search.enabled,
		project_id: search.project_id,
	}),
	loader: ({ context, deps, cause }) => {
		void context.queryClient.prefetchQuery(policiesListQueryOptions);
		void context.queryClient.prefetchQuery(policyBindingsAllQueryOptions);
		void context.queryClient.prefetchQuery(accountListQueryOptions);
		return awaitOnEnter(
			cause,
			Promise.all([
				context.queryClient.ensureQueryData(
					serviceAccountsListQuery(toServiceAccountsParams(deps)),
				),
				context.queryClient.ensureQueryData(projectsListQueryOptions),
			]),
		);
	},
	component: ServiceAccountsPage,
});

function ServiceAccountsPage() {
	return (
		<div>
			<PageHeader
				title="Service accounts"
				description="Non-human principals that belong to a project, a team or a user and hold API keys."
			/>
			<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
				<ServiceAccountsTable />
			</Suspense>
		</div>
	);
}
