import type { QueryClient, QueryKey } from "@tanstack/react-query";

interface Identified {
	metadata: { id?: string };
}

/** What a cache held before an optimistic write, to put back on failure. */
export type CacheSnapshot = ReadonlyArray<[QueryKey, unknown]>;

function hasItems(data: unknown): data is { items: unknown[] } {
	return (
		typeof data === "object" &&
		data !== null &&
		"items" in data &&
		Array.isArray(data.items)
	);
}

function sameResource(data: unknown, id: string): boolean {
	return (
		typeof data === "object" &&
		data !== null &&
		"metadata" in data &&
		typeof data.metadata === "object" &&
		data.metadata !== null &&
		"id" in data.metadata &&
		data.metadata.id === id
	);
}

/**
 * Writes `next` into every cached entry under `prefix` that holds it: lists
 * (by `items`) and the resource's own entry. Returns what was there, for
 * {@link restoreCaches}. An enable switch flips through this before its save,
 * so it never shows the old state while the request runs.
 */
export function swapIntoCaches<T extends Identified>(
	queryClient: QueryClient,
	prefix: QueryKey,
	next: T,
): CacheSnapshot {
	const id = next.metadata.id;
	const snapshot = queryClient.getQueriesData({ queryKey: prefix });
	if (!id) return snapshot;
	for (const [key, data] of snapshot) {
		if (hasItems(data)) {
			if (!data.items.some((item) => sameResource(item, id))) continue;
			queryClient.setQueryData(key, {
				...data,
				items: data.items.map((item) => (sameResource(item, id) ? next : item)),
			});
		} else if (sameResource(data, id)) {
			queryClient.setQueryData(key, next);
		}
	}
	return snapshot;
}

/** Puts back what {@link swapIntoCaches} replaced. */
export function restoreCaches(
	queryClient: QueryClient,
	snapshot: CacheSnapshot,
): void {
	for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
}
