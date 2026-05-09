import type { components } from "@/api/types.gen";

/** Secret as returned by GET /admin/secrets and GET /admin/secrets/:name */
export type SecretResponse = components["schemas"]["SecretResponse"];
export type SecretValueFromResponse =
	components["schemas"]["SecretValueFromResponse"];

/** Input types for create/update */
export type SecretValueFromInput =
	components["schemas"]["SecretValueFromInput"];
export type SecretWriteBody = components["schemas"]["SecretWriteBody"];

export type SecretListResponse = components["schemas"]["SecretListOutputBody"];

/** Convenience alias for create body */
export type SecretCreate = components["schemas"]["SecretWriteBody"];

/** Convenience alias for update body */
export type SecretUpdate = components["schemas"]["SecretWriteBody"];

/** Secret kind for UI */
export type SecretKind = "env" | "stored";
