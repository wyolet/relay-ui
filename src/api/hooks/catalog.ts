import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";

export type CatalogResolveResponse = components["schemas"]["resolveOutputBody"];

/**
 * Query options for `/catalog/resolve`. Pass a list of catalog-ref strings;
 * the response includes `expanded[]` (canonical `provider/model@host` refs),
 * `models[]`, `hosts[]`, `bindings[]`. Refs are sorted so equivalent calls
 * share a cache entry.
 */
export function catalogResolveQueryOptions(refs: readonly string[]) {
	const sorted = [...refs].sort();
	return queryOptions({
		queryKey: ["catalog", "resolve", sorted] as const,
		queryFn: async (): Promise<CatalogResolveResponse> => {
			const { data, error } = await apiClient.GET("/catalog/resolve", {
				params: { query: { ref: sorted } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		enabled: sorted.length > 0,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/**
 * Resolve a list of catalog refs against the backend catalog. Returns an
 * empty result while the refs list is empty (the query is disabled).
 */
export function useCatalogResolve(refs: readonly string[]) {
	return useQuery(catalogResolveQueryOptions(refs));
}
