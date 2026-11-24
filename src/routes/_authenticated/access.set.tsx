import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { ACCESS_TARGET_KINDS } from "@/access/accessTarget";
import { SetAccess } from "@/access/SetAccess";
import { catalogGraphQueryOptions } from "@/api/hooks/catalog";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { policyBindingsAllQueryOptions } from "@/api/hooks/policyBindings";
import { poolListQueryOptions } from "@/api/hooks/pools";
import { feature } from "@/api/runtimeConfig";
import { SHORTCUT_FLAGS } from "@/lib/shortcutFlags";
import { PageLoader } from "@/shared/Spinner";

// `kind` would clash with the audit page's array-valued search key.
const searchSchema = z.object({
	targetKind: z.enum(ACCESS_TARGET_KINDS).optional().catch(undefined),
	id: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/access/set")({
	validateSearch: searchSchema,
	beforeLoad: () => {
		if (!feature(SHORTCUT_FLAGS.access)) throw redirect({ to: "/" });
	},
	loader: ({ context }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(policiesListQueryOptions);
		void queryClient.prefetchQuery(policyBindingsAllQueryOptions);
		void queryClient.prefetchQuery(poolListQueryOptions);
		void queryClient.prefetchQuery(hostsListQueryOptions);
		void queryClient.prefetchQuery(
			catalogGraphQueryOptions({ includeDeprecated: true }),
		);
	},
	component: SetAccessPage,
});

function SetAccessPage() {
	const { targetKind, id } = Route.useSearch();
	return (
		<Suspense fallback={<PageLoader />}>
			<SetAccess kind={targetKind} id={id} />
		</Suspense>
	);
}
