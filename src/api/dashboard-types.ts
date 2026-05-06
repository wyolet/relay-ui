/**
 * Hand-written types for dashboard endpoints whose response bodies are not
 * described in the OpenAPI spec (/healthz has content?: never in the generated
 * spec — the spec only describes error shapes there).
 *
 * NOTE: /admin/metrics does NOT exist on the live backend.
 * NOTE: /admin/version is now in the schema as VersionResponse; we re-export it
 *       from here for backwards compat with dashboard.ts which imports VersionResponse.
 */

import type { components } from "#/api/types.gen";

/** Re-export from the generated schema so importers don't break. */
export type VersionResponse = components["schemas"]["VersionResponse"];

export type HealthStatusLevel = "ok" | "degraded" | "error";

export interface HealthSubsystem {
	status: HealthStatusLevel;
	error?: string;
}

export interface HealthzResponse {
	catalog: HealthSubsystem;
	state: HealthSubsystem;
	eventlog: HealthSubsystem;
	otel: HealthSubsystem;
	/**
	 * Present when the relay backend has a configured master key.
	 */
	master_key_configured?: boolean;
}
