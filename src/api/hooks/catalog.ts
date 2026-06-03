import {
	queryOptions,
	useQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";

export type CatalogResolveResponse = components["schemas"]["resolveOutputBody"];
export type CatalogGraphResponse = components["schemas"]["graphOutputBody"];

/** Optional server-side filters for `/catalog/graph`. */
export interface CatalogGraphParams {
	/** Label selectors, `key=value` (all must match), e.g. `["featured=true"]`. */
	label?: readonly string[];
	/** Include deprecated models (default false drops them server-side). */
	includeDeprecated?: boolean;
}

/**
 * Query options for `/catalog/graph` — the compact, server-built catalog
 * (providers + hosts w/ `iconPath` + models w/ `providerId`/`bindings`) used to
 * populate the model picker. The server filters to enabled rows and dedups, so
 * the UI never re-derives resolution from the heavyweight `/models` etc. lists.
 *
 * Pass `label`/`includeDeprecated` to filter server-side (e.g.
 * `{ label: ["featured=true"] }`). Filters are part of the query key, so each
 * filter combination caches independently.
 */
export function catalogGraphQueryOptions(params: CatalogGraphParams = {}) {
	const label =
		params.label && params.label.length > 0
			? [...params.label].sort()
			: undefined;
	const includeDeprecated = params.includeDeprecated ? true : undefined;
	return queryOptions({
		queryKey: ["catalog", "graph", { label, includeDeprecated }] as const,
		queryFn: async (): Promise<CatalogGraphResponse> => {
			const { data, error } = await apiClient.GET("/catalog/graph", {
				params: {
					query: {
						...(label ? { label: [...label] } : {}),
						...(includeDeprecated ? { includeDeprecated } : {}),
					},
				},
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/** Compact catalog graph for the picker. See {@link catalogGraphQueryOptions}. */
export function useCatalogGraph(params?: CatalogGraphParams) {
	return useSuspenseQuery(catalogGraphQueryOptions(params));
}

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
