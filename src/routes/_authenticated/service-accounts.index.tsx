import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { serviceAccountsListQuery } from "@/api/hooks/serviceAccounts";
import {
	ServiceAccountsTable,
	toServiceAccountsParams,
} from "@/service-accounts/ServiceAccountsTable";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	q: z.string().default(""),
	enabled: z.enum(["all", "true", "false"]).catch("all").default("all"),
	project_id: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/service-accounts/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({
		q: search.q,
		enabled: search.enabled,
		project_id: search.project_id,
	}),
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				serviceAccountsListQuery(toServiceAccountsParams(deps)),
			),
			context.queryClient.ensureQueryData(projectsListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
		]),
	component: ServiceAccountsPage,
});

function ServiceAccountsPage() {
	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">
					Service accounts
				</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					Non-human principals that live in a project and hold API keys.
				</p>
			</div>
			<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
				<ServiceAccountsTable />
			</Suspense>
		</div>
	);
}
