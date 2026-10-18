import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { VersionResponse } from "@/api/dashboard-types";
import type { components } from "@/api/types.gen";

export type { VersionResponse };

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

export type ControlHealth = components["schemas"]["ControlHealth"];

export const healthzQueryOptions = queryOptions({
	queryKey: ["healthz"] as const,
	queryFn: async (): Promise<ControlHealth> => {
		const { data, error, response } = await apiClient.GET("/healthz");
		if (data) return data;
		// A degraded control plane answers 503 with the same body: which
		// backends failed, not that the relay is unreachable.
		if (response.status === 503 && error) return error;
		throw new Error(`/healthz failed: ${response.status}`);
	},
	staleTime: 0,
	gcTime: 60_000,
	// Poll every 5s while answering; back off to 60s once it fails. Relays
	// predating the control /healthz answer 404, and each failed poll would
	// otherwise re-render the dashboard every 5s.
	refetchInterval: (query) => (query.state.status === "error" ? 60_000 : 5_000),
});
