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

export type LatencyRungLabel = "p50" | "p95" | "p99" | "max";

export interface LatencyRung {
	label: LatencyRungLabel;
	ms: number;
	/** This rung's value relative to the largest rung, 0..1. */
	share: number;
}

/** Percentiles ordered p50 → max, each with its share of the largest value. */
export function latencyLadder(stats: LatencyStats): LatencyRung[] {
	const rungs: Array<[LatencyRungLabel, number]> = [
		["p50", stats.p50],
		["p95", stats.p95],
		["p99", stats.p99],
		["max", stats.max],
	];
	const peak = Math.max(...rungs.map(([, ms]) => ms), 0);
	return rungs.map(([label, ms]) => ({
		label,
		ms,
		share: peak > 0 ? ms / peak : 0,
	}));
}
