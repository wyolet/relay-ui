/**
 * Hand-written types for Model CRUD endpoints (PER-276).
 *
 * Backend assumptions:
 * - GET  /admin/models            → { items: Model[] }
 * - GET  /admin/models/:name      → Model
 * - POST /admin/models            → Model  (201)
 * - PUT  /admin/models/:name      → Model  (200)
 * - DELETE /admin/models/:name    → 204
 *
 * All CRUD payloads use a k8s-style { metadata, spec } envelope.
 */

import type { RateLimitRef } from "./ratelimit";

export type ModelCapability = "chat" | "embeddings" | "completions" | "vision";

export interface ModelPricing {
	/** Cost per 1M input tokens in USD. */
	input_per_million: number;
	/** Cost per 1M output tokens in USD. */
	output_per_million: number;
}

export interface ModelMetadata {
	name: string;
	[k: string]: unknown;
}

export interface ModelSpec {
	/** Name of the provider that serves this model. */
	provider: string;
	/** Upstream model identifier (e.g. "gpt-4o"). */
	upstream_name: string;
	capabilities: ModelCapability[];
	pricing?: ModelPricing;
	rateLimits?: RateLimitRef[];
}

export interface Model {
	metadata: ModelMetadata;
	spec: ModelSpec;
}

/** POST body: full envelope */
export type ModelCreate = Model;

/** PUT body: spec only (name is in URL path) */
export interface ModelUpdate {
	spec: ModelSpec;
}

export interface ModelsListResponse {
	items: Model[];
}
