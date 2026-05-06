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
 * Secret shape:
 * - kind === 'env':    env_var is present, masked_value is absent
 * - kind === 'stored': masked_value is present (e.g. "sk-...A1B2"), env_var is absent
 *
 * TODO: /healthz may include master_key_configured: boolean. When that field is
 * confirmed by the backend team, update HealthzResponse in dashboard-types.ts
 * and wire the stored-mode availability check in the create/edit forms.
 * For now, absent === available (we don't block stored-mode creation).
 */

export type SecretKind = "env" | "stored";

export interface Secret {
	name: string;
	kind: SecretKind;
	/** Present when kind === 'stored'. Masked form, e.g. "sk-...A1B2". Never cleartext. */
	masked_value?: string;
	/** Present when kind === 'env'. The environment variable name on the relay host. */
	env_var?: string;
}

export interface SecretCreate {
	name: string;
	value_from: EnvValueFrom | StoredValueFrom;
}

export type SecretUpdate = Omit<SecretCreate, "name">;

export interface EnvValueFrom {
	kind: "env";
	env_var: string;
}

export interface StoredValueFrom {
	kind: "stored";
	value: string;
}

export interface SecretsListResponse {
	items: Secret[];
}
