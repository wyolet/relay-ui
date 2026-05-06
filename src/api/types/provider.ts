import type { components } from "#/api/types.gen";

export type Provider = components["schemas"]["Provider"];
export type ProviderSpec = components["schemas"]["ProviderSpec"];
export type ProviderListResponse =
	components["schemas"]["ListOutputProviderBody"];

/** POST body: full envelope (same shape as the resource) */
export type ProviderCreate = components["schemas"]["Provider"];

/** PUT body: full envelope (same shape as the resource) */
export type ProviderUpdate = components["schemas"]["Provider"];
