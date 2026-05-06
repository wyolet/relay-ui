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
 * Error shape (4xx):
 *   { error: { message: string; references?: Array<{ kind: string; name: string }> } }
 */

export type ProviderKind = "openai" | "ollama";

export interface Provider {
	name: string;
	kind: ProviderKind;
	endpoint: string;
	/** Name of the secret used for API-key auth. Ollama providers typically omit this. */
	secret?: string;
}

export interface ProviderCreate {
	name: string;
	kind: ProviderKind;
	endpoint: string;
	secret?: string;
}

export type ProviderUpdate = Omit<ProviderCreate, "name">;

export interface ProvidersListResponse {
	items: Provider[];
}
