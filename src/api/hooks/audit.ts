import {
	type InfiniteData,
	infiniteQueryOptions,
	queryOptions,
	useQuery,
	useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { components, operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

// --- Schema-derived types ---

/** One audited control-plane request. */
export type AuditEvent = components["schemas"]["AuditEvent"];
export type AuditPage = components["schemas"]["auditListOutputBody"];
export type AuditResource = components["schemas"]["AuditResource"];

/** Server-side filters accepted by GET /audit (minus pagination, which we own). */
export type AuditFilter = Omit<
	NonNullable<operations["audit_list"]["parameters"]["query"]>,
	"limit" | "cursor"
>;

const LIST_PAGE_SIZE = 100;

export function auditInfiniteQueryOptions(filter: AuditFilter = {}) {
	return infiniteQueryOptions({
		queryKey: ["audit", "list", filter] as const,
		queryFn: async ({ pageParam }): Promise<AuditPage> => {
			const data = unwrap(
				await apiClient.GET("/audit", {
					params: {
						query: {
							...filter,
							limit: LIST_PAGE_SIZE,
							cursor: pageParam || undefined,
						},
					},
				}),
			);
			return data;
		},
		initialPageParam: "",
		getNextPageParam: (last) => last.next_cursor || undefined,
		staleTime: 15_000,
		gcTime: 5 * 60_000,
	});
}

/**
 * The audit feed (newest first), flattened across pages so components render
 * rows rather than query plumbing. `fetchNextPage` walks the keyset cursor
 * backwards in time.
 */
export function useAudit(filter: AuditFilter = {}) {
	const query = useSuspenseInfiniteQuery(auditInfiniteQueryOptions(filter));
	return {
		events: flattenEvents(query.data),
		fetchNextPage: query.fetchNextPage,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
	};
}

function flattenEvents(data: InfiniteData<AuditPage>): AuditEvent[] {
	return data.pages.flatMap((page) => page.events ?? []);
}

// --- Facet options ---

/** The distinct values offered by the action / resource-kind pickers. */
export interface AuditFacets {
	actions: string[];
	kinds: string[];
}

const FACET_SAMPLE_SIZE = 200;

/**
 * Distinct actions and resource kinds seen in the window. There is no facet
 * endpoint, and the vocabulary is open (kinds come from whatever the
 * authorizer was handed), so the pickers are built from a sample of the
 * window rather than a hardcoded list. Scoped to the time range only — the
 * options must not collapse as the other facets narrow the feed.
 */
export function auditFacetsQueryOptions(window: {
	from?: string;
	to?: string;
}) {
	return queryOptions({
		queryKey: ["audit", "facets", window] as const,
		queryFn: async (): Promise<AuditFacets> => {
			const data = unwrap(
				await apiClient.GET("/audit", {
					params: { query: { ...window, limit: FACET_SAMPLE_SIZE } },
				}),
			);
			const actions = new Set<string>();
			const kinds = new Set<string>();
			for (const e of data.events ?? []) {
				actions.add(e.action);
				if (e.resource.kind) kinds.add(e.resource.kind);
			}
			return {
				actions: [...actions].sort(),
				kinds: [...kinds].sort(),
			};
		},
		staleTime: 60_000,
		gcTime: 5 * 60_000,
	});
}

/** Non-suspending facet options — the filter bar renders before they land. */
export function useAuditFacets(window: { from?: string; to?: string }) {
	const { data } = useQuery(auditFacetsQueryOptions(window));
	return data ?? { actions: [], kinds: [] };
}

// --- Denied-outcome count (dashboard tile) ---

/** The audit API returns no totals, so the tile counts a capped page and
 * says "N+" when the cursor shows more. */
const DENIED_PROBE_LIMIT = 500;

export interface DeniedCount {
	events: number;
	/** More denials exist beyond the probe — render the count as "N+". */
	truncated: boolean;
}

export function deniedAuditCountQueryOptions(from: string) {
	return queryOptions({
		queryKey: ["audit", "denied-count", from] as const,
		queryFn: async (): Promise<DeniedCount> => {
			const data = unwrap(
				await apiClient.GET("/audit", {
					params: {
						query: { status: "denied", from, limit: DENIED_PROBE_LIMIT },
					},
				}),
			);
			return {
				events: (data.events ?? []).length,
				truncated: Boolean(data.next_cursor),
			};
		},
		staleTime: 60_000,
		gcTime: 5 * 60_000,
		// A deployment without audit access answers 403 — a permanent answer.
		retry: false,
	});
}

/** Denied control-plane requests since `from`. Non-suspending and never
 * retried: the tile hides rather than failing the dashboard. */
export function useDeniedAuditCount(from: string): DeniedCount | null {
	const { data } = useQuery(deniedAuditCountQueryOptions(from));
	return data ?? null;
}
