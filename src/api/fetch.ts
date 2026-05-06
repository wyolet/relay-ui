/**
 * Typed fetch helpers for the Relay admin API.
 *
 * Uses plain fetch (not openapi-fetch) because the CRUD resource endpoints
 * return `content?: never` in the generated spec (the backend responds with
 * real bodies but they are not yet described in the OpenAPI schema). All
 * errors are parsed into ApiError so callers get structured error information.
 */

import { ApiError, type ApiErrorResponse } from "./types/errors";

const BASE_URL =
	typeof window !== "undefined"
		? window.location.origin
		: "http://localhost:8080";

async function parseError(res: Response): Promise<ApiError> {
	try {
		const body = (await res.json()) as ApiErrorResponse;
		return new ApiError(res.status, body.error);
	} catch {
		return new ApiError(res.status, {
			message: `HTTP ${res.status}`,
			type: "api_error",
		});
	}
}

export async function adminGet<T>(path: string): Promise<T> {
	const res = await fetch(`${BASE_URL}${path}`, { credentials: "include" });
	if (!res.ok) throw await parseError(res);
	return res.json() as Promise<T>;
}

export async function adminPost<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(`${BASE_URL}${path}`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw await parseError(res);
	return res.json() as Promise<T>;
}

export async function adminPut<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(`${BASE_URL}${path}`, {
		method: "PUT",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw await parseError(res);
	return res.json() as Promise<T>;
}

export async function adminDelete(path: string): Promise<void> {
	const res = await fetch(`${BASE_URL}${path}`, {
		method: "DELETE",
		credentials: "include",
	});
	if (!res.ok) throw await parseError(res);
}
