import type { Page, Route } from "@playwright/test";

const isApi = (route: Route): boolean => {
	const t = route.request().resourceType();
	return t === "xhr" || t === "fetch";
};

export interface MockGraph {
	policies: unknown[];
	hostKeys: unknown[];
	hosts: unknown[];
	models: unknown[];
	rateLimits: unknown[];
	relayKeys: unknown[];
	providers: unknown[];
	proxyMode?: { value: { enabled: boolean; allowUnauthenticated: boolean } };
}

export const EMPTY_GRAPH: MockGraph = {
	policies: [],
	hostKeys: [],
	hosts: [],
	models: [],
	rateLimits: [],
	relayKeys: [],
	providers: [],
	proxyMode: { value: { enabled: false, allowUnauthenticated: false } },
};

function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
	if (!isApi(route)) return route.fallback();
	return route.fulfill({
		status,
		contentType: "application/json",
		body: JSON.stringify(body),
	});
}

/**
 * Registers route handlers for every endpoint the diagnostic graph hooks
 * load. Only XHR/fetch requests are intercepted — document navigations
 * fall through to the dev server so the SPA HTML still loads.
 */
export async function mockApi(page: Page, graph: MockGraph): Promise<void> {
	const detailHandler = <T extends { metadata: { name: string } }>(
		items: T[],
	) => (route: Route) => {
		if (!isApi(route)) return route.fallback();
		const url = new URL(route.request().url());
		const ref = url.pathname.split("/").pop() ?? "";
		const match = items.find((i) => i.metadata.name === ref);
		if (!match)
			return fulfillJson(
				route,
				{ error: { type: "invalid_request_error", message: "not found" } },
				404,
			);
		return fulfillJson(route, match);
	};

	await page.route(
		"**/policies/*",
		detailHandler(graph.policies as { metadata: { name: string } }[]),
	);
	await page.route(
		"**/host-keys/*",
		detailHandler(graph.hostKeys as { metadata: { name: string } }[]),
	);
	await page.route(
		"**/rate-limits/*",
		detailHandler(graph.rateLimits as { metadata: { name: string } }[]),
	);
	await page.route(
		"**/relay-keys/*",
		detailHandler(graph.relayKeys as { metadata: { name: string } }[]),
	);
	await page.route(
		"**/models/*",
		detailHandler(graph.models as { metadata: { name: string } }[]),
	);

	await page.route(
		"**/policies",
		(route) => void fulfillJson(route, { items: graph.policies }),
	);
	await page.route(
		"**/host-keys",
		(route) => void fulfillJson(route, { items: graph.hostKeys }),
	);
	await page.route(
		"**/hosts",
		(route) => void fulfillJson(route, { items: graph.hosts }),
	);
	await page.route(
		"**/models",
		(route) => void fulfillJson(route, { items: graph.models }),
	);
	await page.route(
		"**/rate-limits",
		(route) => void fulfillJson(route, { items: graph.rateLimits }),
	);
	await page.route(
		"**/relay-keys",
		(route) => void fulfillJson(route, { items: graph.relayKeys }),
	);
	await page.route(
		"**/providers",
		(route) => void fulfillJson(route, { items: graph.providers }),
	);
	await page.route("**/settings/proxy-mode", (route) => {
		void fulfillJson(route, graph.proxyMode ?? EMPTY_GRAPH.proxyMode);
	});
	await page.route("**/auth/whoami", (route) => {
		// fetchWhoami treats `user_id` truthy as authenticated.
		void fulfillJson(route, { user_id: "test-user", username: "test" });
	});
}
