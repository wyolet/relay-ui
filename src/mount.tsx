import { QueryCache, QueryClient } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { whoamiQueryOptions } from "@/api/auth";
import { ApiError } from "@/api/types/errors";
import { TooltipProvider } from "@/components/ui/tooltip";
import { applyTheme, useThemeStore } from "@/stores/theme";
import { getRouter } from "./router";

/**
 * Mounts the app. Imported dynamically from `main.tsx` *after* the runtime
 * config has loaded, so everything reachable from here (router → API client)
 * reads the resolved config.
 */
export function mountApp(): void {
	// Apply theme before React mounts to avoid flash.
	applyTheme(useThemeStore.getState().theme);

	// A session-expiry (401) from any query drops auth state and routes to
	// /login. The whoami probe itself never throws (it maps non-OK to
	// `{authenticated:false}`), so this can't loop through the auth guard; the
	// pathname guard covers the already-on-/login case.
	const queryClient = new QueryClient({
		queryCache: new QueryCache({
			onError: (error) => {
				if (!(error instanceof ApiError) || error.status !== 401) return;
				if (router.state.location.pathname === "/login") return;
				queryClient.setQueryData(whoamiQueryOptions.queryKey, {
					authenticated: false,
					roles: [],
					scopes: [],
				});
				void router.navigate({ to: "/login" });
			},
		}),
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

	const router = getRouter(queryClient);
	const rootElement = document.getElementById("app");

	if (rootElement && !rootElement.innerHTML) {
		const root = ReactDOM.createRoot(rootElement);
		root.render(
			<TooltipProvider delay={200}>
				<RouterProvider router={router} />
			</TooltipProvider>,
		);
	}
}
