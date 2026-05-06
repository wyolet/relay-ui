import { queryOptions } from "@tanstack/react-query";
import type {
	HealthzResponse,
	ListResponse,
	VersionResponse,
} from "#/api/dashboard-types";

const BASE_URL =
	typeof window !== "undefined"
		? window.location.origin
		: "http://localhost:8080";

async function fetchJson<T>(path: string): Promise<T> {
	const res = await fetch(`${BASE_URL}${path}`, { credentials: "include" });
	if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
	return res.json() as Promise<T>;
}

export const versionQueryOptions = queryOptions({
	queryKey: ["admin", "version"] as const,
	queryFn: () => fetchJson<VersionResponse>("/admin/version"),
	staleTime: 5 * 60_000,
	gcTime: 10 * 60_000,
});

// NOTE: /admin/metrics does NOT exist on the live backend — endpoint is pending.
// metricsQueryOptions has been removed; the dashboard shows a placeholder instead.

export const healthzQueryOptions = queryOptions({
	queryKey: ["healthz"] as const,
	queryFn: () => fetchJson<HealthzResponse>("/healthz"),
	staleTime: 0,
	gcTime: 60_000,
	refetchInterval: 5_000,
});

function listQueryOptions(kind: string) {
	return queryOptions({
		queryKey: ["admin", "list", kind] as const,
		queryFn: () => fetchJson<ListResponse>(`/admin/${kind}`),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export const providersQueryOptions = listQueryOptions("providers");
export const poolsQueryOptions = listQueryOptions("pools");
export const secretsQueryOptions = listQueryOptions("secrets");
export const modelsQueryOptions = listQueryOptions("models");
export const routesQueryOptions = listQueryOptions("routes");
export const ratelimitsQueryOptions = listQueryOptions("ratelimits");
