import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { catalogGraphQueryOptions } from "@/api/hooks/catalog";
import { feature } from "@/api/runtimeConfig";
import { SHORTCUT_FLAGS } from "@/lib/shortcutFlags";
import { AddLimit } from "@/limits/AddLimit";
import { PageLoader } from "@/shared/Spinner";

// `kind` would clash with the audit page's array-valued search key.
const searchSchema = z.object({
	targetKind: z
		.enum(["team", "project", "serviceaccount"])
		.optional()
		.catch(undefined),
	id: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/limits/add")({
	validateSearch: searchSchema,
	beforeLoad: () => {
		if (!feature(SHORTCUT_FLAGS.limit)) throw redirect({ to: "/" });
	},
	loader: ({ context }) => {
		void context.queryClient.prefetchQuery(
			catalogGraphQueryOptions({ includeDeprecated: true }),
		);
	},
	component: AddLimitPage,
});

function AddLimitPage() {
	const { targetKind, id } = Route.useSearch();
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-xl font-semibold text-foreground">Add a limit</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Put a spend cap or a rate limit on a team, project or agent.
				</p>
			</div>
			<Suspense fallback={<PageLoader />}>
				<AddLimit kind={targetKind} id={id ?? ""} />
			</Suspense>
		</div>
	);
}
