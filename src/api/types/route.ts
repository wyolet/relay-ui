import type { components } from "#/api/types.gen";

export type RelayRoute = components["schemas"]["Route"];
export type RelayRouteSpec = components["schemas"]["RouteSpec"];
export type RouteListResponse = components["schemas"]["ListOutputRouteBody"];

/** POST body: full envelope (same shape as the resource) */
export type RelayRouteCreate = components["schemas"]["Route"];

/** PUT body: full envelope (same shape as the resource) */
export type RelayRouteUpdate = components["schemas"]["Route"];
