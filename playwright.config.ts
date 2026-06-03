import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "list",
	use: {
		baseURL: "http://localhost:5140",
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
		url: "http://localhost:5140",
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
});
