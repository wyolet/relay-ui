import type { components } from "#/api/types.gen";

/**
 * Standard error inner shape returned by the Relay backend.
 * Derived from OpenAPI schema `components.schemas.OpenAIErrorInner`.
 */
export type ApiErrorBody = components["schemas"]["OpenAIErrorInner"];

/**
 * Top-level error envelope from the Relay backend.
 * Derived from OpenAPI schema `components.schemas.OpenAIError`.
 */
export type ApiErrorResponse = components["schemas"]["OpenAIError"];

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
