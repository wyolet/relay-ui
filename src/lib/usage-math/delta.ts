/**
 * Pure value-comparison math for period-over-period deltas. Returns domain
 * values (counts, ratios), never formatted strings — formatting stays at the
 * render edge so presentation can change without touching the math.
 */

export type DeltaDirection = "up" | "down" | "flat";

export interface DeltaResult {
	current: number;
	previous: number;
	/** `current - previous`, in the metric's own unit. */
	delta: number;
	/** Relative change vs previous (`delta / previous`); null without a baseline. */
	ratio: number | null;
	direction: DeltaDirection;
}

export function compareValue(current: number, previous: number): DeltaResult {
	const delta = current - previous;
	return {
		current,
		previous,
		delta,
		ratio: previous !== 0 ? delta / previous : null,
		direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
	};
}
