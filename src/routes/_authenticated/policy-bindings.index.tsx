import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { policyBindingsListQuery } from "@/api/hooks/policyBindings";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import {
	PolicyBindingsTable,
	toPolicyBindingsParams,
} from "@/policy-bindings/PolicyBindingsTable";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	q: z.string().default(""),
	project_id: z.string().catch("").default(""),
	policy: z.string().catch("").default(""),
	subject: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/policy-bindings/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ ...search }),
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				policyBindingsListQuery(toPolicyBindingsParams(deps)),
			),
			context.queryClient.ensureQueryData(projectsListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
		]),
	component: PolicyBindingsPage,
});

function PolicyBindingsPage() {
	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">
					Policy bindings
				</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					Points the callers inside one project at one policy. The lowest
					priority wins.
				</p>
			</div>
			<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
				<PolicyBindingsTable />
			</Suspense>
		</div>
	);
}
