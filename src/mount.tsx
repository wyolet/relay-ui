import { QueryClient } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
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

	const queryClient = new QueryClient({
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
