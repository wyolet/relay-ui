/**
 * Hand-written types for Model CRUD endpoints (PER-276).
 *
 * Backend assumptions:
 * - GET  /admin/models            → { items: Model[] }
 * - GET  /admin/models/:name      → Model
 * - POST /admin/models            → Model  (201)
 * - PUT  /admin/models/:name      → Model  (200)
 * - DELETE /admin/models/:name    → 204
 */

export type ModelCapability = "chat" | "embeddings" | "completions" | "vision";

export interface ModelPricing {
	/** Cost per 1M input tokens in USD. */
	input_per_million: number;
	/** Cost per 1M output tokens in USD. */
	output_per_million: number;
}

export interface Model {
	name: string;
	/** Name of the provider that serves this model. */
	provider: string;
	/** Upstream model identifier (e.g. "gpt-4o"). */
	upstream_name: string;
	capabilities: ModelCapability[];
	pricing?: ModelPricing;
}

export interface ModelCreate {
	name: string;
	provider: string;
	upstream_name: string;
	capabilities: ModelCapability[];
	pricing?: ModelPricing;
}

export type ModelUpdate = Omit<ModelCreate, "name">;

export interface ModelsListResponse {
	items: Model[];
}
