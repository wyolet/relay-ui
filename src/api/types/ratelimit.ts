/**
 * Hand-written types for RateLimit CRUD endpoints (PER-276).
 *
 * Backend assumptions:
 * - GET  /admin/ratelimits            → { items: RateLimit[] }
 * - GET  /admin/ratelimits/:name      → RateLimit
 * - POST /admin/ratelimits            → RateLimit  (201)
 * - PUT  /admin/ratelimits/:name      → RateLimit  (200)
 * - DELETE /admin/ratelimits/:name    → 204
 */

export type RateLimitStrategy =
	| "fixed_window"
	| "sliding_window"
	| "token_bucket";
export type RateLimitSource = "ip" | "api_key" | "user" | "global";

export interface RateLimit {
	name: string;
	strategy: RateLimitStrategy;
	/** Window duration in seconds. */
	window: number;
	/** Maximum number of requests (or tokens for token_bucket) in the window. */
	amount: number;
	source: RateLimitSource;
}

export interface RateLimitCreate {
	name: string;
	strategy: RateLimitStrategy;
	window: number;
	amount: number;
	source: RateLimitSource;
}

export type RateLimitUpdate = Omit<RateLimitCreate, "name">;

export interface RateLimitsListResponse {
	items: RateLimit[];
}
