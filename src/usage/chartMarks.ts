/**
 * Marks every usage chart shares: thin columns rounded only at the data end, a
 * ground-colored gap between stacked segments, and at most three gridlines.
 */
export const BAR_MAX = 22;
export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
export const SEGMENT_GAP = { stroke: "var(--bg)", strokeWidth: 2 } as const;
export const Y_TICK_COUNT = 3;
export const AXIS_PROPS = {
	tickLine: false,
	axisLine: false,
	tickMargin: 8,
} as const;
