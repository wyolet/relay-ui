import { QueryClient } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { applyTheme, useThemeStore } from "@/stores/theme";
import { getRouter } from "./router";

// Surface the built version for debugging which relay-ui a pinned deploy is serving.
const UI_VERSION = import.meta.env.VITE_UI_VERSION;
console.info(`relay-ui ${UI_VERSION}`);
document.documentElement.dataset.uiVersion = UI_VERSION;

// Apply theme before React mounts to avoid flash
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
