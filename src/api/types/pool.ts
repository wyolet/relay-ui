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
 * All CRUD payloads use a k8s-style { metadata, spec } envelope.
 *
 * Pool health summary is not yet available.
 * TODO: implement pool health when /admin/keypool/:pool/health endpoint is added.
 */

import type { RateLimitRef } from "./ratelimit";

export interface PoolMetadata {
	name: string;
	[k: string]: unknown;
}

export interface PoolSpec {
	provider: string;
	secrets: string[];
	default?: boolean;
	rateLimits?: RateLimitRef[];
}

export interface Pool {
	metadata: PoolMetadata;
	spec: PoolSpec;
}

/** POST body: full envelope */
export type PoolCreate = Pool;

/** PUT body: spec only (name is in URL path) */
export interface PoolUpdate {
	spec: PoolSpec;
}

export interface PoolsListResponse {
	items: Pool[];
}
