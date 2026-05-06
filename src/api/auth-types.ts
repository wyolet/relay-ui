/**
 * Minimal hand-written types for auth endpoints.
 *
 * NOTE: These are awaiting schema regen once wyolet/relay exposes /openapi.json
 * with the auth endpoints (tracked in PER-273 / PER-274). When `pnpm gen:api`
 * is run against a relay backend that includes these routes, delete this file
 * and update src/api/auth.ts to derive types from `paths` / `components`.
 */

export interface WhoamiResponse {
	authenticated: boolean;
}

export interface UiLoginRequest {
	token: string;
}

export interface UiLoginResponse {
	authenticated: boolean;
}
