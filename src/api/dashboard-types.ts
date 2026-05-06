/**
 * Hand-written types for dashboard endpoints not yet in the OpenAPI spec.
 *
 * NOTE: These endpoints (GET /admin/version, GET /admin/metrics, GET /healthz,
 * and per-kind list endpoints) are expected to be added to the relay OpenAPI
 * spec in a future ticket. When `pnpm gen:api` is run against a relay backend
 * that includes these routes, delete this file and derive types from
 * `paths` / `components` in types.gen.ts.
 *
 * Backend assumptions (PER-275):
 * - GET /admin/version → { version: string }
 * - GET /admin/metrics → { eventlog_dropped: number, otel_dropped: number,
 *     metadata_rejected: number, auth_rejected: number }
 * - GET /healthz → { catalog: HealthStatus, state: HealthStatus,
 *     eventlog: HealthStatus, otel: HealthStatus }
 *   where HealthStatus = { status: "ok" | "degraded" | "error", error?: string }
 * - GET /admin/providers → { items: Array<{ name: string }> }
 * - GET /admin/secrets   → { items: Array<{ name: string }> }
 * - GET /admin/pools     → { items: Array<{ name: string }> }
 * - GET /admin/models    → { items: Array<{ name: string }> }
 * - GET /admin/routes    → { items: Array<{ name: string }> }
 * - GET /admin/ratelimits → { items: Array<{ name: string }> }
 */

export interface VersionResponse {
  version: string
}

export type HealthStatusLevel = 'ok' | 'degraded' | 'error'

export interface HealthSubsystem {
  status: HealthStatusLevel
  error?: string
}

export interface HealthzResponse {
  catalog: HealthSubsystem
  state: HealthSubsystem
  eventlog: HealthSubsystem
  otel: HealthSubsystem
}

export interface MetricsResponse {
  eventlog_dropped: number
  otel_dropped: number
  metadata_rejected: number
  auth_rejected: number
}

/** Minimal shape sufficient for counting items in a list endpoint. */
export interface NamedItem {
  name: string
}

export interface ListResponse {
  items: NamedItem[]
}
