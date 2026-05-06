/**
 * Hand-written types for Pool CRUD endpoints (PER-277).
 *
 * Backend assumptions:
 * - GET    /admin/pools            → { items: Pool[] }
 * - GET    /admin/pools/:name      → Pool
 * - POST   /admin/pools            → Pool  (201)
 * - PUT    /admin/pools/:name      → Pool  (200)
 * - DELETE /admin/pools/:name      → 204
 *
 * Pool health summary is not yet available.
 * TODO: implement pool health when /admin/keypool/:pool/health endpoint is added.
 */

export interface Pool {
	name: string;
	provider: string;
	secrets: string[];
	default?: boolean;
}

export interface PoolCreate {
	name: string;
	provider: string;
	secrets: string[];
	default?: boolean;
}

export type PoolUpdate = Omit<PoolCreate, "name">;

export interface PoolsListResponse {
	items: Pool[];
}
