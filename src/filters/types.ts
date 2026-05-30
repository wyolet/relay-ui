/**
 * Declarative table-filter convention. A page describes its filters once as a
 * `FilterDef[]`; <FilterBar> renders them identically everywhere, and
 * `toQueryParams` serializes the state into plain backend query params. State
 * lives in the route's URL search (the route still owns its zod schema — that's
 * its typed contract — but the keys/labels/options/defaults come from here).
 */

export interface FilterOption {
	value: string;
	label: string;
}

interface FilterBase {
	/** URL search-param key. Must match the route's zod schema key. */
	key: string;
	label: string;
	/**
	 * Value treated as "unset" — omitted from query params and from the active
	 * count. For search: the empty string; for select: the all/any option.
	 */
	default?: FilterValue;
}

/** Free-text search box (left-aligned in the bar). */
export interface SearchFilter extends FilterBase {
	type: "search";
	placeholder?: string;
}

/** Single-choice dropdown chip. */
export interface SelectFilter extends FilterBase {
	type: "select";
	options: readonly FilterOption[];
}

/** On/off chip. */
export interface ToggleFilter extends FilterBase {
	type: "toggle";
}

export type FilterDef = SearchFilter | SelectFilter | ToggleFilter;

/** A single filter's URL value. */
export type FilterValue = string | boolean;

/** The flat state object — the route's search params, keyed by FilterDef.key. */
export type FilterState = Record<string, FilterValue | undefined>;

/** Read one def's value out of state with the right primitive type. */
export function readBool(state: FilterState, key: string): boolean {
	return state[key] === true;
}

export function readText(state: FilterState, key: string): string {
	const v = state[key];
	return typeof v === "string" ? v : "";
}
