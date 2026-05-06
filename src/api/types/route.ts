/**
 * Hand-written types for Route CRUD endpoints (PER-276).
 *
 * Backend assumptions:
 * - GET  /admin/routes            → { items: RelayRoute[] }
 * - GET  /admin/routes/:name      → RelayRoute
 * - POST /admin/routes            → RelayRoute  (201)
 * - PUT  /admin/routes/:name      → RelayRoute  (200)
 * - DELETE /admin/routes/:name    → 204
 *
 * Named RelayRoute to avoid collision with the browser's built-in Route types.
 * All CRUD payloads use a k8s-style { metadata, spec } envelope.
 */

export interface RelayRouteMetadata {
	name: string;
	[k: string]: unknown;
}

export interface RelayRouteSpec {
	/** Name of the pool this route forwards to. */
	pool: string;
	/** ACL spec as raw text (newline-separated rules). */
	acl: string;
}

export interface RelayRoute {
	metadata: RelayRouteMetadata;
	spec: RelayRouteSpec;
}

/** POST body: full envelope */
export type RelayRouteCreate = RelayRoute;

/** PUT body: spec only (name is in URL path) */
export interface RelayRouteUpdate {
	spec: RelayRouteSpec;
}

export interface RoutesListResponse {
	items: RelayRoute[];
}
