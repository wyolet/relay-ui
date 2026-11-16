import type { components } from "@/api/types.gen";
import type { FilterOption } from "@/filters/types";
import { contextKey, contextName, type WorkContext } from "@/lib/workContext";

type Owner = components["schemas"]["Owner"];

/** Host- and provider-owned catalog rows (tier presets). */
export const HOST_OWNED = "host";
/** Rows owned by a scope the caller has no context for (another user's). */
export const OTHER_OWNERS = "other";

/** Owned by a host or provider: a preset that came with a provider's catalog,
 * not one made in this relay. */
function isPresetKind(
	kind: Owner["kind"],
): kind is Extract<Owner["kind"], "host" | "provider"> {
	return kind === "host" || kind === "provider";
}

export function isCatalogPreset(owner: Owner | undefined): boolean {
	return owner !== undefined && isPresetKind(owner.kind);
}

export const ORIGINS = ["custom", "system", "provider"] as const;
export type Origin = (typeof ORIGINS)[number];

/** The quick filter's buttons; the explainer is each one's tooltip. */
export const ORIGIN_OPTIONS = [
	{ value: "custom", label: "Custom", title: "Made in this relay." },
	{
		value: "system",
		label: "System",
		title: "Relay's own built-ins, shared with every scope.",
	},
	{
		value: "provider",
		label: "Provider",
		title: "Presets that come with each provider's catalog.",
	},
] as const satisfies readonly { value: Origin; label: string; title: string }[];

/** Which layer a row comes from: made in this relay, relay's built-ins, or a catalog preset. */
export function originOf(owner: Owner | undefined): Origin {
	if (isCatalogPreset(owner)) return "provider";
	return owner?.kind === "system" ? "system" : "custom";
}

/** Whether a row's origin is picked; none picked takes every one. */
export function onOrigins(
	owner: Owner | undefined,
	picked: readonly Origin[],
): boolean {
	return picked.length === 0 || picked.includes(originOf(owner));
}

/** Rows on the picked layers. The owner filter narrows only custom rows:
 * system and provider rows serve every scope, so any workspace may show them. */
export function filterByOrigin<T extends { metadata: { owner?: Owner } }>(
	rows: readonly T[],
	picked: readonly Origin[],
	ownerMatches: (row: T) => boolean,
): T[] {
	return rows.filter(
		(row) =>
			onOrigins(row.metadata.owner, picked) &&
			(originOf(row.metadata.owner) !== "custom" || ownerMatches(row)),
	);
}

/** A row owner as the filter keys it: the context it sits in, or a bucket. */
export function ownerFilterKey(
	owner: Owner | undefined,
	actorUserId: string | undefined,
): string {
	const kind = owner?.kind ?? "user";
	if (isPresetKind(kind)) return HOST_OWNED;
	if (kind === "system") return contextKey({ kind: "system", id: "" });
	if (kind === "user") {
		return contextKey({ kind: "personal", id: owner?.id || actorUserId || "" });
	}
	return contextKey({ kind, id: owner?.id ?? "" });
}

/** The caller's contexts, then the buckets only when some row falls in them. */
export function ownerFilterOptions(
	contexts: readonly WorkContext[],
	rowKeys: ReadonlySet<string>,
): FilterOption[] {
	const listed = contexts.map((c) => ({
		value: contextKey(c),
		label: contextName(c),
	}));
	const listedKeys = new Set(listed.map((o) => o.value));
	const buckets: FilterOption[] = [];
	if (rowKeys.has(HOST_OWNED)) {
		buckets.push({ value: HOST_OWNED, label: "Host presets" });
	}
	if ([...rowKeys].some((k) => k !== HOST_OWNED && !listedKeys.has(k))) {
		buckets.push({ value: OTHER_OWNERS, label: "Other owners" });
	}
	return [...listed, ...buckets];
}

/** Whether a row keyed `key` passes; nothing selected passes every row. */
export function matchesOwnerFilter(
	key: string,
	selected: readonly string[],
	listedKeys: ReadonlySet<string>,
): boolean {
	if (selected.length === 0 || selected.includes(key)) return true;
	return (
		selected.includes(OTHER_OWNERS) &&
		key !== HOST_OWNED &&
		!listedKeys.has(key)
	);
}

/** The trigger's value: "All", the one owner's name, or a count. */
export function ownerFilterSummary(
	selected: readonly string[],
	options: readonly FilterOption[],
): string {
	if (selected.length === 0) return "All";
	if (selected.length === 1) {
		return options.find((o) => o.value === selected[0])?.label ?? "1 owner";
	}
	return `${selected.length} owners`;
}
