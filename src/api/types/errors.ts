import type { components } from "@/api/types.gen";

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
