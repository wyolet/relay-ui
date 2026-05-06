/**
 * Hand-written types for Secret CRUD endpoints (PER-278).
 *
 * Backend assumptions:
 * - GET    /admin/secrets            → { items: Secret[] }
 * - GET    /admin/secrets/:name      → Secret
 * - POST   /admin/secrets            → Secret  (201, never returns cleartext)
 * - PUT    /admin/secrets/:name      → Secret  (200, never returns cleartext)
 * - DELETE /admin/secrets/:name      → 204
 *
 * All CRUD payloads use a k8s-style { metadata, spec } envelope.
 *
 * Secret shape:
 * - kind === 'env':    env_var is present, masked_value is absent
 * - kind === 'stored': masked_value is present (e.g. "sk-...A1B2"), env_var is absent
 *
 * TODO: /healthz may include master_key_configured: boolean. When that field is
 * confirmed by the backend team, update HealthzResponse in dashboard-types.ts
 * and wire the stored-mode availability check in the create/edit forms.
 * For now, absent === available (we don't block stored-mode creation).
 */

import type { RateLimitRef } from "./ratelimit";

export type SecretKind = "env" | "stored";

export interface EnvValueFrom {
	kind: "env";
	env_var: string;
}

export interface StoredValueFrom {
	kind: "stored";
	value: string;
}

export interface SecretMetadata {
	name: string;
	[k: string]: unknown;
}

export interface SecretSpec {
	kind: SecretKind;
	/** Present when kind === 'stored'. Masked form, e.g. "sk-...A1B2". Never cleartext. */
	masked_value?: string;
	/** Present when kind === 'env'. The environment variable name on the relay host. */
	env_var?: string;
	/** On create/update: provide value_from instead of masked_value. */
	value_from?: EnvValueFrom | StoredValueFrom;
	rateLimits?: RateLimitRef[];
}

export interface Secret {
	metadata: SecretMetadata;
	spec: SecretSpec;
}

/** POST body: full envelope with value_from in spec */
export interface SecretCreate {
	metadata: SecretMetadata;
	spec: {
		value_from: EnvValueFrom | StoredValueFrom;
		rateLimits?: RateLimitRef[];
	};
}

/** PUT body: spec only (name is in URL path) */
export interface SecretUpdate {
	spec: {
		value_from: EnvValueFrom | StoredValueFrom;
		rateLimits?: RateLimitRef[];
	};
}

export interface SecretsListResponse {
	items: Secret[];
}
