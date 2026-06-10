/**
 * Pure math for the dashboard's operational-attention block: whose requests
 * are being rejected (throttled, auth-failed, …), which upstream keys have
 * tripped their circuit breaker, and which hosts are erroring. Hooks fetch
 * and feed data in; components render the shaped results.
 */

/** One group's slice of some filtered volume (e.g. its 4xx count). */
export interface VolumeLeader {
	key: string;
	count: number;
}

export interface VolumeLeaders {
	total: number;
	top: VolumeLeader[];
}

/** Structurally matches a /usage/summary row scoped to one group dimension;
 * kept local so the lib stays dependency-free of the schema module. */
export interface VolumeRow {
	group: { [key: string]: string };
	requests: number;
}

/** Total volume plus the heaviest groups, largest first. */
export function volumeLeaders(
	rows: VolumeRow[],
	dimension: string,
	limit = 3,
): VolumeLeaders {
	const sorted = rows
		.map((r) => ({
			key: r.group?.[dimension]?.trim() || "—",
			count: r.requests,
		}))
		.filter((g) => g.count > 0)
		.sort((a, b) => b.count - a.count);
	return {
		total: sorted.reduce((sum, g) => sum + g.count, 0),
		top: sorted.slice(0, limit),
	};
}

/** 4xx volume split into the operator-meaningful kinds. */
export interface RejectionBuckets {
	total: number;
	/** 429 — rate limited. */
	throttled: number;
	/** 401/403 — bad, expired, or unauthorized keys. */
	auth: number;
	/** Everything else 4xx (bad requests, unknown models, …). */
	other: number;
}

/**
 * Split total 4xx volume into throttled / auth / other. `other` is derived,
 * clamped at zero in case the three counts come from windows that drifted
 * a refetch apart.
 */
export function rejectionBuckets(
	total: number,
	throttled: number,
	auth: number,
): RejectionBuckets {
	return {
		total,
		throttled,
		auth,
		other: Math.max(total - throttled - auth, 0),
	};
}

/** The per-group stats degradedHosts ranks; matches UsageGroupStat shape. */
export interface HostErrorStat {
	key: string;
	requests: number;
	errorCount: number;
	errorRate: number; // 0..1
}

export interface DegradedThresholds {
	/** Ignore hosts below this volume — a 1/3 failure isn't "degraded". */
	minRequests: number;
	/** Error-rate floor (0..1) for calling a host degraded. */
	minErrorRate: number;
}

export const DEGRADED_DEFAULTS: DegradedThresholds = {
	minRequests: 20,
	minErrorRate: 0.05,
};

/** Hosts over both thresholds, worst error rate first. */
export function degradedHosts<T extends HostErrorStat>(
	stats: T[],
	{ minRequests, minErrorRate }: DegradedThresholds = DEGRADED_DEFAULTS,
): T[] {
	return stats
		.filter((s) => s.requests >= minRequests && s.errorRate >= minErrorRate)
		.sort((a, b) => b.errorRate - a.errorRate);
}

/** Structurally matches the API's hostKeyHealth, plus the key's identity. */
export interface BreakerStatus {
	id: string;
	label: string;
	state: string; // closed | open | half_open | unknown
	indefinite?: boolean;
	reason?: string;
	cooldownRemainingSeconds?: number;
}

/**
 * Keys whose breaker needs attention: open or half-open, worst first —
 * indefinite opens (auth failures that persist until rotation) ahead of timed
 * cooldowns, opens ahead of half-opens. Closed/unknown keys are healthy noise.
 */
export function breakerAttention<T extends BreakerStatus>(items: T[]): T[] {
	const severity = (s: BreakerStatus) =>
		(s.indefinite ? 2 : 0) + (s.state === "open" ? 1 : 0);
	return items
		.filter((s) => s.state === "open" || s.state === "half_open")
		.sort((a, b) => severity(b) - severity(a));
}
