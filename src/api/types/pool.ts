import type { components } from "@/api/types.gen";

export type Pool = components["schemas"]["Pool"];
export type PoolSpec = components["schemas"]["PoolSpec"];
export type PoolListResponse = components["schemas"]["ListOutputPoolBody"];
export type RateLimitAttachment = components["schemas"]["RateLimitAttachment"];

/** POST body: full envelope (same shape as the resource) */
export type PoolCreate = components["schemas"]["Pool"];

/** PUT body: full envelope (same shape as the resource) */
export type PoolUpdate = components["schemas"]["Pool"];
