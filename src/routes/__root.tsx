import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { whoamiQueryOptions } from "#/api/auth";

import "../styles.css";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	async beforeLoad({ context, location }) {
		const { queryClient } = context;
		// Probe auth state; fetchWhoami never throws on 401 — returns {authenticated:false}
		const whoami = await queryClient.ensureQueryData(whoamiQueryOptions);
		if (!whoami.authenticated && location.pathname !== "/login") {
			throw redirect({ to: "/login" });
		}
		if (whoami.authenticated && location.pathname === "/login") {
			throw redirect({ to: "/" });
		}
	},
	component: RootComponent,
});

function RootComponent() {
	const { queryClient } = Route.useRouteContext();

	return (
		<QueryClientProvider client={queryClient}>
			<Outlet />
			{import.meta.env.DEV && <TanStackRouterDevtools />}
		</QueryClientProvider>
	);
}
