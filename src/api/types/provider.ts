/**
 * Hand-written types for Provider CRUD endpoints (PER-276).
 *
 * Backend assumptions:
 * - GET  /admin/providers            → { items: Provider[] }
 * - GET  /admin/providers/:name      → Provider
 * - POST /admin/providers            → Provider  (201)
 * - PUT  /admin/providers/:name      → Provider  (200)
 * - DELETE /admin/providers/:name    → 204
 *
 * All CRUD payloads use a k8s-style { metadata, spec } envelope.
 *
 * Error shape (4xx):
 *   { error: { message: string; references?: Array<{ kind: string; name: string }> } }
 */

export type ProviderKind = "openai" | "ollama";

export interface ProviderMetadata {
	name: string;
	[k: string]: unknown;
}

export interface ProviderSpec {
	kind: ProviderKind;
	endpoint: string;
	/** Name of the secret used for API-key auth. Ollama providers typically omit this. */
	secret?: string;
}

export interface Provider {
	metadata: ProviderMetadata;
	spec: ProviderSpec;
}

/** POST body: full envelope */
export type ProviderCreate = Provider;

/** PUT body: spec only (name is in URL path) */
export interface ProviderUpdate {
	spec: ProviderSpec;
}

export interface ProvidersListResponse {
	items: Provider[];
}
