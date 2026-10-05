import { useDeferredValue } from "react";

/**
 * Splits a route's search into the live value (drives the filter inputs) and a
 * deferred copy (drives the list query). A filter change then keeps the current
 * rows on screen while the next result loads, instead of suspending to a
 * fallback that unmounts the search box mid-typing.
 */
export function useDeferredSearch<T>(live: T) {
	const search = useDeferredValue(live);
	return { search, isStale: search !== live };
}
