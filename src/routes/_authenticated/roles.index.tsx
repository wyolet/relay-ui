import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { licenseQueryOptions } from "@/api/hooks/license";
import { rolesListQuery } from "@/api/hooks/roles";
import { RolesTable, toRolesParams } from "@/roles/RolesTable";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	q: z.string().default(""),
	enabled: z.enum(["all", "true", "false"]).catch("all").default("all"),
});

export const Route = createFileRoute("/_authenticated/roles/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ q: search.q, enabled: search.enabled }),
	loader: ({ context, deps }) => {
		void context.queryClient.prefetchQuery(licenseQueryOptions);
		return context.queryClient.ensureQueryData(
			rolesListQuery(toRolesParams(deps)),
		);
	},
	component: RolesPage,
});

function RolesPage() {
	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">Roles</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					A named set of kind × verb rules. A role carries no scope — the role
					binding supplies it.
				</p>
			</div>
			<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
				<RolesTable />
			</Suspense>
		</div>
	);
}
