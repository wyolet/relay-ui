import { loadRuntimeConfig } from "@/api/runtimeConfig";

// Surface the built version for debugging which relay-ui a pinned deploy is serving.
const UI_VERSION = import.meta.env.VITE_UI_VERSION;
console.info(`relay-ui ${UI_VERSION}`);
document.documentElement.dataset.uiVersion = UI_VERSION;

// Load runtime config first, then import the app so the API client (and anything
// else reachable from the router) reads the resolved per-deployment values.
async function boot(): Promise<void> {
	await loadRuntimeConfig();
	const { mountApp } = await import("./mount");
	mountApp();
}

void boot();
