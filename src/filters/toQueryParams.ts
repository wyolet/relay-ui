import type { FilterDef, FilterState } from "./types";

/**
 * Serialize filter state into plain backend query params: the shared
 * frontend↔backend contract. Only non-default, non-empty values are emitted —
 * toggles only when on, search/select only when they differ from their default
 * — so the URL and the request stay clean. The backend reads these as ordinary
 * query params (`?status=errors&q=foo`); no grammar, no library.
 */
export function toQueryParams(
	defs: readonly FilterDef[],
	state: FilterState,
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const def of defs) {
		const v = state[def.key];
		if (def.type === "toggle") {
			if (v === true) out[def.key] = "true";
			continue;
		}
		const s = typeof v === "string" ? v : "";
		if (s && s !== def.default) out[def.key] = s;
	}
	return out;
}

/** How many filters are active (differ from default) — for an "N active" badge. */
export function activeFilterCount(
	defs: readonly FilterDef[],
	state: FilterState,
): number {
	return Object.keys(toQueryParams(defs, state)).length;
}
