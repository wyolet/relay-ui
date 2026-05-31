import { test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

/**
 * Screenshot harness for the real /logs Explorer (Shape A). Events carry uuid
 * ids; the mocked catalog resolves them to display names. One request has no
 * captured payload (to verify the inspector drops the tab bar).
 * Run: bun x playwright test e2e/logs-shape-a.spec.ts
 */
const REQ_ID = "req_demo01";
const NOLOG_ID = "req_nolog";

const GRAPH = {
	...EMPTY_GRAPH,
	models: [
		{ metadata: { id: "mdl-1a2b", name: "gpt-4o", displayName: "GPT-4o" } },
		{ metadata: { id: "mdl-mini", name: "gpt-4o-mini", displayName: "GPT-4o mini" } },
		{ metadata: { id: "mdl-claude", name: "claude", displayName: "Claude Sonnet 4.6" } },
	],
	hosts: [
		{ metadata: { id: "hst-9z8y", name: "openai", displayName: "OpenAI" } },
		{ metadata: { id: "hst-ant", name: "anthropic", displayName: "Anthropic" } },
	],
	policies: [
		{ metadata: { id: "pol-def", name: "default", displayName: "Default policy" } },
	],
};

function evt(
	id: string,
	min: number,
	status: number,
	model: string,
	host: string,
	ms: number,
	tokens: number,
	finish: string,
	error?: string,
) {
	return {
		request_id: id,
		ts: new Date(2026, 4, 31, 12, min, 0).toISOString(),
		status,
		duration_ms: ms,
		source: "api",
		model_id: model,
		requested_model: "gpt-4o",
		host_id: host,
		policy_id: "pol-def",
		finish_reason: finish,
		error_kind: error,
		streamed: false,
		attempts: 1,
		tokens: { prompt: Math.round(tokens * 0.8), completion: Math.round(tokens * 0.2) },
	};
}

const EVENTS = [
	evt(REQ_ID, 51, 200, "mdl-1a2b", "hst-9z8y", 1840, 2310, "stop"),
	evt("req_02", 50, 200, "mdl-claude", "hst-ant", 4620, 71500, "stop"),
	evt("req_03", 49, 429, "mdl-1a2b", "hst-9z8y", 120, 0, "error", "rate_limit"),
	evt("req_04", 48, 500, "mdl-claude", "hst-ant", 9120, 0, "error", "upstream_5xx"),
	evt("req_05", 47, 200, "mdl-mini", "hst-9z8y", 640, 880, "stop"),
	evt(NOLOG_ID, 46, 200, "mdl-1a2b", "hst-9z8y", 910, 1500, "stop"),
];

const PAYLOAD = {
	request_body: JSON.stringify({
		model: "gpt-4o",
		messages: [
			{ role: "system", content: "You are a helpful assistant for the Wyolet relay." },
			{ role: "user", content: "Summarize today's traffic anomalies in two sentences." },
		],
	}),
	response_body: JSON.stringify({
		choices: [
			{
				message: {
					role: "assistant",
					content:
						"Traffic was nominal except a brief 5xx spike from the Anthropic host around 12:51, lasting ~30s. Error rate has since returned to 0%.",
				},
			},
		],
	}),
	request_truncated: false,
	response_truncated: false,
};

const HEIGHTS = [8, 12, 6, 14, 22, 18, 9, 30, 26, 11, 24, 33, 40, 28, 19, 13, 21, 16, 10, 25, 31, 17, 12, 20];
const TIMESERIES = {
	from: "",
	to: "",
	rows: [
		{
			points: HEIGHTS.map((v, i) => ({
				bucket: new Date(2026, 4, 31, 12, i, 0).toISOString(),
				requests: v,
				error_count: i === 12 || i === 7 ? Math.round(v * 0.3) : 0,
			})),
		},
	],
};

test("capture logs Explorer", async ({ page }) => {
	await mockApi(page, GRAPH);

	const json = (route: import("@playwright/test").Route, body: unknown) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(body),
		});

	await page.route("**/usage/timeseries**", (route) => {
		const t = route.request().resourceType();
		if (t !== "xhr" && t !== "fetch") return route.fallback();
		return json(route, TIMESERIES);
	});

	await page.route("**/logs**", (route) => {
		const t = route.request().resourceType();
		if (t !== "xhr" && t !== "fetch") return route.fallback();
		const url = new URL(route.request().url());
		const detail = url.pathname.match(/\/logs\/([^/]+)$/);
		if (detail) {
			const id = detail[1];
			const log = EVENTS.find((e) => e.request_id === id) ?? EVENTS[0];
			const payload = id === NOLOG_ID ? null : PAYLOAD;
			return json(route, { log, payload });
		}
		if (url.pathname.endsWith("/logs")) {
			return json(route, { logs: EVENTS, next_cursor: "" });
		}
		return route.fallback();
	});

	await page.setViewportSize({ width: 1440, height: 1000 });
	const ready = () =>
		page.getByRole("heading", { name: "Logs" }).waitFor({ timeout: 8000 });

	await page.goto("/logs");
	await ready();
	await page.waitForTimeout(500);
	await page.screenshot({ path: "e2e/__shots__/shape-a-list.png", fullPage: true });

	// Inline expand of a request that has a captured payload (→ link out).
	await page.goto(`/logs?expand=${REQ_ID}`);
	await ready();
	await page.waitForTimeout(600);
	await page.screenshot({ path: "e2e/__shots__/shape-a-expand.png", fullPage: true });

	// Inline expand of a request with no payload (→ inline note only).
	await page.goto(`/logs?expand=${NOLOG_ID}`);
	await ready();
	await page.waitForTimeout(600);
	await page.screenshot({ path: "e2e/__shots__/shape-a-nopayload.png", fullPage: true });

	// Dedicated request page with the transcript.
	page.on("pageerror", (e) => console.log("[pageerror]", e.message));
	await page.goto(`/logs/${REQ_ID}`);
	await page
		.getByText("Back to logs")
		.waitFor({ timeout: 6000 })
		.catch(() => console.log("[warn] detail page did not render"));
	await page.waitForTimeout(500);
	await page.screenshot({ path: "e2e/__shots__/shape-a-page.png", fullPage: true });

	// Filter bar with active facet chips (status + model + errors).
	const modelParam = encodeURIComponent('["mdl-1a2b"]');
	await page.goto(`/logs?status_class=4xx&errors=true&model_id=${modelParam}`);
	await ready();
	await page.waitForTimeout(500);
	await page.screenshot({ path: "e2e/__shots__/shape-a-filtered.png", fullPage: true });

	// Open the Filters panel to check control uniformity.
	await page.getByRole("button", { name: "Filters" }).click();
	await page.waitForTimeout(300);
	await page.screenshot({ path: "e2e/__shots__/shape-a-panel.png", fullPage: true });
});
