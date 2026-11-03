import { hashKey, type QueryKey } from "@tanstack/react-query";
import type { UsableList } from "@/lib/workContext";

const SCOPE_PARAMS = new Set(["usable_by", "usable_for"]);

function withoutScope(key: QueryKey): unknown[] {
	return key.map((part) =>
		part !== null && typeof part === "object" && !Array.isArray(part)
			? Object.fromEntries(
					Object.entries(part).filter(([k]) => !SCOPE_PARAMS.has(k)),
				)
			: part,
	);
}

/** Whether two list keys name the same list asked for another owner scope. */
export function onlyScopeDiffers(previous: QueryKey, next: QueryKey): boolean {
	return (
		hashKey(previous) !== hashKey(next) &&
		hashKey(withoutScope(previous)) === hashKey(withoutScope(next))
	);
}

/**
 * `placeholderData` for an owner-scoped list: the last scope's rows stay while
 * this scope's load, so a workspace switch never blanks a picker. Any other
 * change (another host) starts empty.
 */
export function keepAcrossScopes(queryKey: QueryKey) {
	return <T>(
		previous: T | undefined,
		previousQuery: { queryKey: QueryKey } | undefined,
	): T | undefined =>
		previousQuery && onlyScopeDiffers(previousQuery.queryKey, queryKey)
			? previous
			: undefined;
}

/** A list query's result as a picker reads it. */
export function usableList<T>(result: {
	data: { items: T[] | null } | undefined;
	isPlaceholderData: boolean;
}): UsableList<T> {
	return {
		items: result.data?.items ?? [],
		loaded: result.data !== undefined,
		fromPreviousScope: result.isPlaceholderData,
	};
}
