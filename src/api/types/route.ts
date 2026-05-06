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
 */

export interface RelayRoute {
	name: string;
	/** Name of the pool this route forwards to. */
	pool: string;
	/** ACL spec as raw text (newline-separated rules). */
	acl: string;
}

export interface RelayRouteCreate {
	name: string;
	pool: string;
	acl: string;
}

export type RelayRouteUpdate = Omit<RelayRouteCreate, "name">;

export interface RoutesListResponse {
	items: RelayRoute[];
}
