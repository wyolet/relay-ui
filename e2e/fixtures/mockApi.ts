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
	keys: unknown[];
	providers: unknown[];
	hostBindings?: unknown[];
	proxyMode?: { value: { enabled: boolean; allowUnauthenticated: boolean } };
	/** whoami roles; none means a signed-in non-admin. */
	roles?: string[];
}

export const EMPTY_GRAPH: MockGraph = {
	policies: [],
	hostKeys: [],
	hosts: [],
	models: [],
	rateLimits: [],
	keys: [],
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

/** A standalone model↔host binding, the shape `/host-bindings` lists. */
export function hostBinding(modelId: string, hostId: string, upstreamName: string) {
	return {
		metadata: { id: `hb-${modelId}-${hostId}`, name: `${upstreamName}-${hostId}` },
		spec: { modelId, hostId, upstreamName, adapter: "openai", enabled: true },
	};
}

interface Resource {
	metadata: { id?: string; name: string };
}

// Graph-backed collections; every other list endpoint answers empty, so a page
// gaining a new query never falls through to the dev-server proxy.
const GRAPH_COLLECTIONS: Record<
	string,
	keyof Omit<MockGraph, "proxyMode" | "roles">
> = {
	policies: "policies",
	"host-keys": "hostKeys",
	hosts: "hosts",
	models: "models",
	"rate-limits": "rateLimits",
	keys: "keys",
	providers: "providers",
	"host-bindings": "hostBindings",
};
const EMPTY_COLLECTIONS = new Set([
	"groups",
	"policy-bindings",
	"pricings",
	"projects",
	"role-bindings",
	"roles",
	"service-accounts",
	"teams",
	"users",
	"tokens",
]);

// Server-side aggregates on a policy's detail page, answered empty: the specs
// exercise client-side diagnostics, not these joins.
const POLICY_SUBRESOURCES: Record<string, object> = {
	hosts: { hosts: [] },
	models: { models: [], excluded: [] },
	"rate-limits": { rateLimits: [], overlaps: [], unthrottled: [] },
};

const NOT_FOUND = { error: { type: "invalid_request_error", message: "not found" } };

/**
 * Answers every control-API XHR/fetch from `graph`, keyed on the path after
 * `/api/` (query strings ignored). Document navigations fall through to the dev
 * server so the SPA HTML still loads. Specs may register narrower routes after
 * this; Playwright runs the latest matching route first.
 */
export async function mockApi(page: Page, graph: MockGraph): Promise<void> {
	await page.route("**/api/**", (route) => {
		if (!isApi(route)) return route.fallback();
		const path = new URL(route.request().url()).pathname.replace(/^.*?\/api\//, "");
		if (path === "auth/whoami") {
			// fetchWhoami treats `user_id` truthy as authenticated.
			return fulfillJson(route, {
				user_id: "test-user",
				username: "test",
				roles: graph.roles ?? [],
			});
		}
		if (path === "settings/proxy-mode") {
			return fulfillJson(route, graph.proxyMode ?? EMPTY_GRAPH.proxyMode);
		}
		if (path.startsWith("settings/governance:")) {
			return fulfillJson(route, {
				section: path.slice("settings/".length),
				value: { allowEdit: true, allowDelete: true },
			});
		}
		if (path === "version") return fulfillJson(route, { version: "test" });
		if (path === "catalog/graph") {
			return fulfillJson(route, { hosts: [], models: [], providers: [] });
		}
		if (path === "usage/summary") {
			return fulfillJson(route, { from: "", to: "", rows: [] });
		}
		const [collection = "", ...rest] = path.split("/");
		const key = GRAPH_COLLECTIONS[collection];
		const items = (key ? (graph[key] ?? []) : []) as Resource[];
		if (rest[0] === "by-id" && rest[2] === "references") {
			return fulfillJson(route, { items: [] });
		}
		if (collection === "policies" && rest.length === 2) {
			const match = items.find((i) => i.metadata.name === rest[0]);
			const policy = { id: match?.metadata.id ?? "", name: rest[0] };
			const sub = POLICY_SUBRESOURCES[rest[1] ?? ""];
			if (match && sub) return fulfillJson(route, { policy, ...sub });
		}
		if (rest.length === 0 && (key || EMPTY_COLLECTIONS.has(collection))) {
			return fulfillJson(route, { items, total: items.length });
		}
		if (key && rest.length === 1) {
			const match = items.find(
				(i) => i.metadata.name === rest[0] || i.metadata.id === rest[0],
			);
			return match
				? fulfillJson(route, match)
				: fulfillJson(route, NOT_FOUND, 404);
		}
		return fulfillJson(route, NOT_FOUND, 404);
	});
}
