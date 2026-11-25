import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { AddAgentLikeThis } from "@/agent-page/AddAgentLikeThis";
import { loadAgentCopy } from "@/agent-page/useAgentCopy";
import { AddAgent } from "@/agents/AddAgent";
import { catalogGraphQueryOptions } from "@/api/hooks/catalog";
import { myContextsQueryOptions } from "@/api/hooks/contexts";
import { feature } from "@/api/runtimeConfig";
import { SHORTCUT_FLAGS } from "@/lib/shortcutFlags";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute(
	"/_authenticated/service-accounts/add-agent",
)({
	// `from`: a service account id whose setup the form starts on.
	validateSearch: z.object({ from: z.string().optional() }),
	beforeLoad: ({ search }) => {
		if (search.from && !feature(SHORTCUT_FLAGS.copyAgent)) {
			throw redirect({ to: "/service-accounts/add-agent", search: {} });
		}
	},
	loaderDeps: ({ search }) => ({ from: search.from }),
	loader: async ({ context, deps }) => {
		void context.queryClient.prefetchQuery(
			catalogGraphQueryOptions({ includeDeprecated: true }),
		);
		const contexts = context.queryClient.ensureQueryData(
			myContextsQueryOptions,
		);
		if (deps.from) await loadAgentCopy(context.queryClient, deps.from);
		return contexts;
	},
	component: AddAgentPage,
});

function AddAgentPage() {
	const navigate = useNavigate();
	const { from } = Route.useSearch();
	const cancel = () => void navigate({ to: "/service-accounts" });
	return (
		<div>
			<PageHeader
				back={<BackLink to="/service-accounts">Service accounts</BackLink>}
				title="Add agent"
				description="A service account, what it may use, and a key for it, in one pass."
			/>
			<Suspense fallback={<PageLoader />}>
				{from ? (
					<AddAgentLikeThis key={from} from={from} onCancel={cancel} />
				) : (
					<AddAgent onCancel={cancel} />
				)}
			</Suspense>
		</div>
	);
}
