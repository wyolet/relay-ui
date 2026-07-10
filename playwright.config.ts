import { defineConfig, devices } from "@playwright/test";

// Same env var the dev server reads, so the two never drift; fallback is the
// repo's allocated slot.
const PORT = process.env.RELAY_UI_PORT ?? "5140";
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "list",
	use: {
		baseURL: BASE_URL,
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		// Point runtime config at a path that doesn't resolve to JSON, so config
		// load falls back to origin defaults → apiClient stays same-origin → all
		// calls land on the Vite dev server, which Playwright route-mocks intercept.
		command: "VITE_RUNTIME_CONFIG_URL=/__e2e_no_config.json bun run dev",
		url: BASE_URL,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
});
