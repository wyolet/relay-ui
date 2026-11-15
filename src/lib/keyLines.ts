import type { Key, KeyPrincipal } from "@/api/types/key";
import { displayLabel } from "@/lib/displayLabel";
import type { ModelUsage } from "@/lib/pricingMatrix";

export const KEYS_SORT_KEYS = [
	"usage",
	"used",
	"newest",
	"name",
	"expires",
] as const;
export type KeysSortKey = (typeof KEYS_SORT_KEYS)[number];
export interface KeysSort {
	key: KeysSortKey;
	dir: "asc" | "desc";
}

/** The direction each sort reads best in, applied when it's picked. */
export const KEYS_SORT_DIR: Record<KeysSortKey, KeysSort["dir"]> = {
	usage: "desc",
	used: "desc",
	newest: "desc",
	name: "asc",
	expires: "asc",
};

/** How far back "Last used" looks; older traffic reads as "Not in 90 days". */
export const LAST_USED_DAYS = 90;

/** A key with its last week of traffic and its latest request in the last
 * {@link LAST_USED_DAYS}, when it had any. */
export interface KeyLine {
	key: Key;
	usage?: ModelUsage;
	/** ISO time of the key's latest request. */
	lastUsed?: string;
}

const label = (l: KeyLine) => displayLabel(l.key.metadata);
const created = (l: KeyLine) => Date.parse(l.key.metadata.createdAt ?? "") || 0;
const expiry = (l: KeyLine) => Date.parse(l.key.spec.expiresAt ?? "");
const used = (l: KeyLine) => Date.parse(l.lastUsed ?? "") || 0;

/** Each sort's ascending order. */
const ASCENDING: Record<KeysSortKey, (a: KeyLine, b: KeyLine) => number> = {
	usage: (a, b) =>
		(a.usage?.usd ?? 0) - (b.usage?.usd ?? 0) ||
		(a.usage?.requests ?? 0) - (b.usage?.requests ?? 0),
	used: (a, b) => used(a) - used(b),
	newest: (a, b) => created(a) - created(b),
	name: (a, b) => label(a).localeCompare(label(b)),
	expires: (a, b) => {
		const [x, y] = [expiry(a), expiry(b)];
		return Number.isNaN(x) || Number.isNaN(y) ? 0 : x - y;
	},
};

/** Lines in the chosen order, ties by name. Keys that never expire stay last
 * under the expiry sort, and unused keys under the last-used sort, in either
 * direction. */
export function sortKeyLines(
	lines: readonly KeyLine[],
	sort: KeysSort,
): KeyLine[] {
	const sign = sort.dir === "asc" ? 1 : -1;
	return [...lines].sort((a, b) => {
		if (sort.key === "expires") {
			const never =
				Number(Number.isNaN(expiry(a))) - Number(Number.isNaN(expiry(b)));
			if (never !== 0) return never;
		}
		if (sort.key === "used") {
			const unused = Number(!a.lastUsed) - Number(!b.lastUsed);
			if (unused !== 0) return unused;
		}
		return sign * ASCENDING[sort.key](a, b) || label(a).localeCompare(label(b));
	});
}

/** Who a key acts as: the server-filled name, else the service account's
 * label from `labels`, else a short id. */
export function principalName(
	principal: KeyPrincipal,
	labels: ReadonlyMap<string, string>,
): string {
	return (
		principal.name || labels.get(principal.id) || `${principal.id.slice(0, 6)}…`
	);
}

export const PRINCIPAL_KIND_LABELS: Record<KeyPrincipal["kind"], string> = {
	serviceaccount: "Service account",
	user: "User",
};

export type ExpiryTone = "never" | "expired" | "soon" | "later";

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
/** Within this, an expiry reads as a warning (the dashboard's horizon too). */
const SOON_MS = 7 * DAY_MS;

function plural(n: number, unit: string): string {
	return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** When a key stops authenticating, in words: "Never", "in 12 days",
 * "Expired". */
export function keyExpiry(
	expiresAt: string | undefined,
	now: number,
): { text: string; tone: ExpiryTone } {
	const at = Date.parse(expiresAt ?? "");
	if (Number.isNaN(at)) return { text: "Never", tone: "never" };
	const left = at - now;
	if (left <= 0) return { text: "Expired", tone: "expired" };
	const tone = left <= SOON_MS ? "soon" : "later";
	if (left < HOUR_MS) return { text: "in under an hour", tone };
	if (left < DAY_MS)
		return { text: `in ${plural(Math.floor(left / HOUR_MS), "hour")}`, tone };
	const days = Math.round(left / DAY_MS);
	if (days < 60) return { text: `in ${plural(days, "day")}`, tone };
	if (days < 730)
		return { text: `in ${plural(Math.round(days / 30), "month")}`, tone };
	return { text: `in ${plural(Math.round(days / 365), "year")}`, tone };
}
