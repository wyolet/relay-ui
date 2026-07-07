import { ApiError, type ApiErrorResponse } from "@/api/types/errors";

/**
 * An openapi-fetch result, narrowed to Relay's error envelope. Every control
 * API error response carries the {@link ApiErrorResponse} `{ error }` shape.
 */
type ApiResult<T> =
	| { data: T; error?: undefined; response: Response }
	| { data?: undefined; error: ApiErrorResponse; response: Response };

/**
 * Unwrap an openapi-fetch `{ data, error, response }` result: return `data` on
 * success, or throw an {@link ApiError} carrying the real HTTP status on error.
 *
 * This preserves the status (401/403/…) that callers like the router-wide error
 * boundary and the global 401 handler depend on — a plain `if (error) throw`
 * discards `response` and reports status 0.
 */
export function unwrap<T>(result: ApiResult<T>): T {
	if (result.error !== undefined) {
		throw new ApiError(result.response.status, result.error.error);
	}
	return result.data;
}
