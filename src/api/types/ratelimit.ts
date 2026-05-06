/**
 * Hand-written types for RateLimit CRUD endpoints (PER-276).
 *
 * Backend assumptions:
 * - GET  /admin/ratelimits            → { items: RateLimit[] }
 * - GET  /admin/ratelimits/:name      → RateLimit
 * - POST /admin/ratelimits            → RateLimit  (201)
 * - PUT  /admin/ratelimits/:name      → RateLimit  (200)
 * - DELETE /admin/ratelimits/:name    → 204
 *
 * All CRUD payloads use a k8s-style { metadata, spec } envelope.
 */

export type RateLimitStrategy =
	| "fixed_window"
	| "sliding_window"
	| "token_bucket";
export type RateLimitSource = "ip" | "api_key" | "user" | "global";

/**
 * Reference to a RateLimit resource embedded in a parent spec's rateLimits[].
 * Used by Pool, Secret, and Model to declare their inline rate limit attachments.
 */
export interface RateLimitRef {
	/** Name of the ratelimit resource. */
	name: string;
	meter: "requests" | "tokens" | "concurrency";
}

export interface RateLimitMetadata {
	name: string;
	[k: string]: unknown;
}

export interface RateLimitSpec {
	strategy: RateLimitStrategy;
	/** Window duration in seconds. */
	window: number;
	/** Maximum number of requests (or tokens for token_bucket) in the window. */
	amount: number;
	source: RateLimitSource;
}

export interface RateLimit {
	metadata: RateLimitMetadata;
	spec: RateLimitSpec;
}

/** POST body: full envelope */
export type RateLimitCreate = RateLimit;

/** PUT body: spec only (name is in URL path) */
export interface RateLimitUpdate {
	spec: RateLimitSpec;
}

export interface RateLimitsListResponse {
	items: RateLimit[];
}
