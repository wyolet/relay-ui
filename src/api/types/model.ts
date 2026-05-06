import type { components } from "#/api/types.gen";

export type Model = components["schemas"]["Model"];
export type ModelSpec = components["schemas"]["ModelSpec"];
export type ModelListResponse = components["schemas"]["ListOutputModelBody"];
export type Capabilities = components["schemas"]["Capabilities"];
export type Modalities = components["schemas"]["Modalities"];
export type Pricing = components["schemas"]["Pricing"];
export type RateLimitAttachment = components["schemas"]["RateLimitAttachment"];

/** POST body: full envelope (same shape as the resource) */
export type ModelCreate = components["schemas"]["Model"];

/** PUT body: full envelope (same shape as the resource) */
export type ModelUpdate = components["schemas"]["Model"];
