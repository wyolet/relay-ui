import { queryOptions } from "@tanstack/react-query";
import { apiClient, CONTROL_API_URL } from "@/api/client";
import type { HealthzResponse, VersionResponse } from "@/api/dashboard-types";

export type { VersionResponse };

async function fetchJson<T>(path: string): Promise<T> {
	const res = await fetch(`${CONTROL_API_URL}${path}`, {
		credentials: "include",
	});
	if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
	return res.json() as Promise<T>;
}

export const versionQueryOptions = queryOptions({
	queryKey: ["admin", "version"] as const,
	queryFn: async (): Promise<VersionResponse> => {
		const { data, error } = await apiClient.GET("/version");
		if (error) throw new Error(error.error.message);
		return data;
	},
	staleTime: 5 * 60_000,
	gcTime: 10 * 60_000,
});

// /healthz has content?: never in the spec but the real backend returns JSON.
// Use raw fetch with the hand-written HealthzResponse shape.
export const healthzQueryOptions = queryOptions({
	queryKey: ["healthz"] as const,
	queryFn: () => fetchJson<HealthzResponse>("/healthz"),
	staleTime: 0,
	gcTime: 60_000,
	refetchInterval: 5_000,
});
