import { test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

/**
 * Screenshot harness for the real /logs generation inspector — mocks the log
 * list + detail with a chat/completions payload so we can verify the transcript
 * parser renders. Run: bun x playwright test e2e/logs-inspector-shot.spec.ts
 */
const REQ_ID = "req_demo01";

const EVENT = {
	request_id: REQ_ID,
	ts: new Date(2026, 4, 31, 12, 51, 40).toISOString(),
	status: 200,
	duration_ms: 1840,
	source: "api",
	model_id: "gpt-4o",
	requested_model: "gpt-4o",
	host_id: "openai",
	policy_id: "default",
	finish_reason: "stop",
	streamed: false,
	attempts: 1,
	tokens: { prompt: 1820, completion: 490 },
};

const REQUEST_BODY = JSON.stringify({
	model: "gpt-4o",
	messages: [
		{ role: "system", content: "You are a helpful assistant for the Wyolet relay." },
		{ role: "user", content: "Summarize today's traffic anomalies in two sentences." },
	],
});

const RESPONSE_BODY = JSON.stringify({
	choices: [
		{
			message: {
				role: "assistant",
				content:
					"Traffic was nominal except a brief 5xx spike from the anthropic host around 12:51, lasting ~30s. Error rate has since returned to 0%.",
			},
		},
	],
	usage: { total_tokens: 2310 },
});

test("capture real logs inspector", async ({ page }) => {
	await mockApi(page, EMPTY_GRAPH);

	await page.route("**/logs**", (route) => {
		// Only intercept API calls — never the SPA document or Vite module scripts
		// (whose paths also contain "/logs", e.g. /src/logs/LogsTable.tsx).
		const t = route.request().resourceType();
		if (t !== "xhr" && t !== "fetch") return route.fallback();
		const url = new URL(route.request().url());
		const detail = url.pathname.match(/\/logs\/([^/]+)$/);
		const json = (body: unknown) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(body),
			});
		if (detail) {
			return json({
				log: EVENT,
				payload: {
					request_body: REQUEST_BODY,
					response_body: RESPONSE_BODY,
					request_truncated: false,
					response_truncated: false,
				},
			});
		}
		if (url.pathname.endsWith("/logs")) {
			return json({ logs: [EVENT], next_cursor: "" });
		}
		return route.fallback();
	});

	page.on("console", (m) => console.log("[console]", m.type(), m.text()));
	page.on("pageerror", (e) => console.log("[pageerror]", e.message));

	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(`/logs?request=${REQ_ID}`);
	await page
		.getByRole("heading", { name: "Logs" })
		.waitFor({ timeout: 8000 })
		.catch(() => console.log("[warn] Logs heading never appeared"));
	await page.waitForTimeout(600);
	await page.screenshot({
		path: "e2e/__shots__/real-inspector.png",
		fullPage: true,
	});
});
