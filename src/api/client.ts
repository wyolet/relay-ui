import createClient from "openapi-fetch";
import type { paths } from "./types.gen";

/**
 * Base URL for the relay control API (admin/management plane).
 *
 * - When VITE_CONTROL_API_URL is set, calls go cross-origin to that host
 *   (e.g. https://relay-control-api.wyolet.dev). Requires the backend to
 *   send permissive CORS + SameSite=None cookies.
 * - Otherwise calls go same-origin — covers OSS users running relay locally
 *   with the UI embedded in the binary.
 */
export const CONTROL_API_URL: string =
	import.meta.env.VITE_CONTROL_API_URL ??
	(typeof window !== "undefined"
		? window.location.origin
		: "http://localhost:8080");

export const apiClient = createClient<paths>({
	baseUrl: CONTROL_API_URL,
	credentials: "include",
});
