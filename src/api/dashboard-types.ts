/**
 * Hand-written types for dashboard endpoints whose response bodies are not yet
 * described in the OpenAPI spec (all admin/healthz 200 responses have
 * `content?: never` in types.gen.ts — the spec describes only error shapes).
 *
 * NOTE: /admin/metrics does NOT exist on the live backend. The metrics section
 * has been removed from the dashboard (TODO: add when backend exposes the endpoint).
 */

export interface VersionResponse {
	version: string;
}

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
	 * Backend assumption: /healthz exposes this boolean after the operator sets
	 * RELAY_MASTER_KEY and restarts the deployment.
	 */
	master_key_configured?: boolean;
}

/** Minimal shape sufficient for counting items in a list endpoint. */
export interface NamedItem {
	name: string;
}

export interface ListResponse {
	items: NamedItem[];
}
