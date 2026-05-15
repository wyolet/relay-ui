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
		// Empty VITE_CONTROL_API_URL so apiClient stays same-origin → all calls
		// land on the Vite dev server, which Playwright route-mocks intercept.
		command: "VITE_CONTROL_API_URL='' bun run dev",
		url: "http://localhost:5140",
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
});
