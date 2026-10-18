import { useDeferredValue } from "react";

/** Wall-clock now floored to `stepMs`, so a window built from it keeps a stable
 * query key between steps. */
export function quantizedNow(stepMs: number): number {
	return Math.floor(Date.now() / stepMs) * stepMs;
}

/**
 * {@link quantizedNow} for render. Deferred: when the step rolls over, the
 * screen keeps the previous window's data until the next window loads instead
 * of suspending to a skeleton.
 */
export function useQuantizedNow(stepMs: number): number {
	return useDeferredValue(quantizedNow(stepMs));
}
