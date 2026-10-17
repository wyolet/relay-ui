import type { components } from "@/api/types.gen";
import { ACCOUNT_DISABLED } from "@/lib/signInError";

/** Standard error inner shape returned by the Relay backend. */
export type ApiErrorBody = components["schemas"]["APIErrorBody"];

/** Top-level error envelope from the Relay backend. */
export type ApiErrorResponse = components["schemas"]["APIError"];

export class ApiError extends Error {
	readonly status: number;
	readonly body: ApiErrorBody;

	constructor(status: number, body: ApiErrorBody) {
		super(body.message);
		this.name = "ApiError";
		this.status = status;
		this.body = body;
	}
}

/** Relay refused the signed-in account itself; it has already ended the session. */
export function isAccountDisabled(err: unknown): err is ApiError {
	return err instanceof ApiError && err.body.code === ACCOUNT_DISABLED;
}

/** An update refused because the row changed after the caller loaded it. */
export function isStaleResourceVersion(err: unknown): err is ApiError {
	return (
		err instanceof ApiError &&
		err.status === 409 &&
		err.body.code === "stale_resource_version"
	);
}
