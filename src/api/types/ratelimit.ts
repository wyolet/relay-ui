import type { components } from "@/api/types.gen";

export type RateLimit = components["schemas"]["RateLimit"];
export type RateLimitSpec = components["schemas"]["RateLimitSpec"];
export type RateLimitListResponse =
	components["schemas"]["ListOutputRateLimitBody"];

/**
 * Inline attachment reference embedded in Pool/Model spec rateLimits[].
 * Schema name: RateLimitAttachment — fields: { Ref: string }.
 * Meter selection moved into RateLimitSpec.rules[].
 */
export type RateLimitAttachment = components["schemas"]["RateLimitAttachment"];
export type RateLimitRule = components["schemas"]["RateLimitRule"];

/** POST body: full envelope (same shape as the resource) */
export type RateLimitCreate = components["schemas"]["RateLimit"];

/** PUT body: full envelope (same shape as the resource) */
export type RateLimitUpdate = components["schemas"]["RateLimit"];
