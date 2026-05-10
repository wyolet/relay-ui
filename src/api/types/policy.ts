/**
 * Policy resource. Backend still calls this "Pool" in OpenAPI; the UI labels it
 * Policy. Types alias the underlying schema so the rename is purely cosmetic
 * until backend catches up.
 */
import type { components } from "@/api/types.gen";

export type Policy = components["schemas"]["Pool"];
export type PolicySpec = components["schemas"]["PoolSpec"];
export type PolicyListResponse = components["schemas"]["ListOutputPoolBody"];
export type RateLimitAttachment = components["schemas"]["RateLimitAttachment"];

/** POST body: full envelope */
export type PolicyCreate = components["schemas"]["Pool"];

/** PUT body: full envelope */
export type PolicyUpdate = components["schemas"]["Pool"];
