/**
 * Pure latency-distribution math. Turns the server's percentile stats into an
 * ordered ladder with relative shares, ready for a bar-per-percentile widget.
 */

/** Structurally matches the API's DurationStats; kept local so the lib stays
 * dependency-free of the schema module. */
export interface LatencyStats {
	avg: number;
	max: number;
	p50: number;
	p95: number;
	p99: number;
}

export type LatencyRungLabel = "p50" | "p95" | "p99";

export interface LatencyRung {
	label: LatencyRungLabel;
	ms: number;
	/** This rung's value relative to the largest rung, 0..1. */
	share: number;
}

/** Percentiles ordered p50 → p99, each with its share of the largest. The
 * single slowest request stays out: one stuck stream would flatten the rest. */
export function latencyLadder(stats: LatencyStats): LatencyRung[] {
	const rungs: Array<[LatencyRungLabel, number]> = [
		["p50", stats.p50],
		["p95", stats.p95],
		["p99", stats.p99],
	];
	const peak = Math.max(...rungs.map(([, ms]) => ms), 0);
	return rungs.map(([label, ms]) => ({
		label,
		ms,
		share: peak > 0 ? ms / peak : 0,
	}));
}

/** Below this share of the period's requests a group is too thin for its p95
 * to say anything. */
export const SLOWEST_MIN_SHARE = 0.01;

/** The group with the highest p95 among those carrying real traffic; null
 * when none does. */
export function slowestGroup<T extends { requests: number; p95: number }>(
	groups: readonly T[],
): T | null {
	const total = groups.reduce((n, g) => n + g.requests, 0);
	const floor = Math.max(1, total * SLOWEST_MIN_SHARE);
	const busy = groups.filter((g) => g.requests >= floor && g.p95 > 0);
	return busy.reduce<T | null>((a, b) => (a && a.p95 >= b.p95 ? a : b), null);
}
