import { QueryClient } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { applyTheme, useThemeStore } from "#/stores/theme";
import { getRouter } from "./router";

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
	root.render(<RouterProvider router={router} />);
}
