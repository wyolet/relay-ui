import type { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { RouteErrorState } from "@/shared/RouteError";
import { PageLoader } from "@/shared/Spinner";
import { routeTree } from "./routeTree.gen";

export function getRouter(queryClient: QueryClient) {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		// Show a spinner while a route loader blocks on fetch. Delayed so
		// cached/preloaded navigations don't flash; held briefly to avoid flicker.
		defaultPendingMs: 200,
		defaultPendingMinMs: 300,
		defaultPendingComponent: () => <PageLoader className="min-h-[60vh]" />,
		// Fallback for thrown query/loader errors (e.g. 403 from a scoped
		// non-admin user) — otherwise TanStack Router's raw default error screen.
		defaultErrorComponent: ({ error }) => <RouteErrorState error={error} />,
		context: { queryClient },
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
