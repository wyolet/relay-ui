/** Relative windows offered for the audit feed, plus the two open-ended cases. */
export const RANGE_VALUES = [
	"1h",
	"24h",
	"7d",
	"30d",
	"all",
	"custom",
] as const;
export type AuditRange = (typeof RANGE_VALUES)[number];

export const RANGE_OPTIONS: readonly { value: AuditRange; label: string }[] = [
	{ value: "1h", label: "Last 1h" },
	{ value: "24h", label: "Last 24h" },
	{ value: "7d", label: "Last 7d" },
	{ value: "30d", label: "Last 30d" },
	{ value: "all", label: "All time" },
	{ value: "custom", label: "Custom…" },
];

/** Outcome statuses the server matches. "" = all. */
export const STATUS_VALUES = ["", "allowed", "denied", "error"] as const;
export type AuditStatus = (typeof STATUS_VALUES)[number];

export const STATUS_OPTIONS: readonly { value: AuditStatus; label: string }[] =
	[
		{ value: "", label: "Any outcome" },
		{ value: "allowed", label: "Allowed" },
		{ value: "denied", label: "Denied" },
		{ value: "error", label: "Error" },
	];

const RANGE_MS: Partial<Record<AuditRange, number>> = {
	"1h": 60 * 60_000,
	"24h": 24 * 60 * 60_000,
	"7d": 7 * 24 * 60 * 60_000,
	"30d": 30 * 24 * 60 * 60_000,
};

/** The absolute bounds a range resolves to, as the RFC3339 the server wants.
 * A relative window's lower bound is floored to the minute: recomputing "now"
 * on every render would otherwise mint a new query key each time and refetch
 * the whole feed. */
export function rangeBounds(
	range: AuditRange,
	customFrom: string,
	customTo: string,
): { from?: string; to?: string } {
	if (range === "all") return {};
	if (range === "custom") {
		return {
			from: localInputToRFC3339(customFrom),
			to: localInputToRFC3339(customTo),
		};
	}
	const span = RANGE_MS[range];
	if (span === undefined) return {};
	const floored = Math.floor((Date.now() - span) / 60_000) * 60_000;
	return { from: new Date(floored).toISOString() };
}

/** `<input type="datetime-local">` value (local wall time, no zone) → RFC3339. */
function localInputToRFC3339(value: string): string | undefined {
	if (!value) return undefined;
	const ms = Date.parse(value);
	return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

/** A scope facet value, as the server matches it. */
export function scopeValue(kind: "team" | "project", id: string): string {
	return `${kind}:${id}`;
}

/** Split "team:<id>" back into its parts; null for anything else. */
export function parseScope(
	value: string,
): { kind: "team" | "project"; id: string } | null {
	const at = value.indexOf(":");
	if (at < 0) return null;
	const kind = value.slice(0, at);
	if (kind !== "team" && kind !== "project") return null;
	return { kind, id: value.slice(at + 1) };
}
