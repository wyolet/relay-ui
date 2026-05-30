import type { LogEvent } from "@/api/hooks/logs";

/** Requests slower than this are flagged by the "Slow" filter. */
export const SLOW_MS = 1000;

export function isErrorEvent(e: LogEvent): boolean {
	return e.status >= 400 || Boolean(e.error_kind);
}

export function isSlowEvent(e: LogEvent): boolean {
	return e.duration_ms >= SLOW_MS;
}
