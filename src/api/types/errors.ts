/**
 * Standard error shape returned by the Relay backend on 4xx responses.
 */

export interface ApiErrorReference {
	kind: string;
	name: string;
}

export interface ApiErrorBody {
	message: string;
	references?: ApiErrorReference[];
}

export interface ApiErrorResponse {
	error: ApiErrorBody;
}

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
