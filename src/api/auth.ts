import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

const BASE_URL =
	typeof window !== "undefined"
		? window.location.origin
		: "http://localhost:8080";

/**
 * GET /admin/whoami — the spec has content?: never for the 200 body, but the
 * real backend returns { authenticated: boolean }. We parse it safely.
 */
async function fetchWhoami(): Promise<{ authenticated: boolean }> {
	const { response } = await apiClient.GET("/admin/whoami");
	// 200 → authenticated. Body shape doesn't matter; presence of a 2xx is the
	// signal. Any non-OK (401 unauthenticated, 5xx backend down) → unauthenticated.
	return { authenticated: response.ok };
}

export const whoamiQueryOptions = queryOptions({
	queryKey: ["auth", "whoami"],
	queryFn: fetchWhoami,
	staleTime: 60_000,
	gcTime: 5 * 60_000,
	retry: false,
});

export function useAuth() {
	const queryClient = useQueryClient();

	const { data } = useQuery(whoamiQueryOptions);
	const authenticated = data?.authenticated ?? false;

	async function login(token: string): Promise<void> {
		// The spec has requestBody?: never for /admin/login but the real backend
		// accepts { token } as JSON. Use raw fetch so we can pass the body.
		const res = await fetch(`${BASE_URL}/admin/login`, {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token }),
		});
		if (!res.ok) {
			if (res.status === 401) {
				throw new AuthError(
					"Invalid token. Check `RELAY_ADMIN_TOKEN` on your relay deployment.",
				);
			}
			throw new Error(`Login failed: ${res.status}`);
		}
		await queryClient.invalidateQueries({
			queryKey: whoamiQueryOptions.queryKey,
		});
	}

	async function logout(): Promise<void> {
		// Use apiClient for the typed POST /admin/logout
		await apiClient.POST("/admin/logout");
		await queryClient.invalidateQueries({
			queryKey: whoamiQueryOptions.queryKey,
		});
	}

	return { authenticated, login, logout };
}

export class AuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AuthError";
	}
}
