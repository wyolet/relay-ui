import { ApiError, type ApiErrorResponse } from "@/api/types/errors";

/** An openapi-fetch result; every control API error carries the `{ error }` envelope. */
type ApiResult = {
	data?: unknown;
	error?: ApiErrorResponse;
	response: Response;
};

/** The `data` of a result's success branch. */
type SuccessData<R> = R extends { data: infer D; error?: never } ? D : never;

/**
 * Unwrap an openapi-fetch `{ data, error, response }` result: return `data` on
 * success, or throw an {@link ApiError} carrying the real HTTP status on error.
 *
 * This preserves the status (401/403/…) that callers like the router-wide error
 * boundary and the global 401 handler depend on — a plain `if (error) throw`
 * discards `response` and reports status 0. Typed over the whole result:
 * inferring `data` and `error` separately loses the data type once an
 * operation's error is a union (a 409 carrying blockers).
 */
export function unwrap<R extends ApiResult>(result: R): SuccessData<R>;
export function unwrap(result: ApiResult): unknown {
	if (result.error === undefined) return result.data;
	const err = result.error;
	const blockers = "blockers" in err ? err.blockers : undefined;
	throw new ApiError(result.response.status, err.error, blockers);
}
