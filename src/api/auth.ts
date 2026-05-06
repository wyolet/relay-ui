import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WhoamiResponse } from "./auth-types";

const BASE_URL =
	typeof window !== "undefined"
		? window.location.origin
		: "http://localhost:8080";

async function fetchWhoami(): Promise<WhoamiResponse> {
	const res = await fetch(`${BASE_URL}/admin/whoami`, {
		credentials: "include",
	});
	if (!res.ok) {
		// 401 → treat as unauthenticated rather than throwing, so the guard can
		// redirect without hitting the global error boundary.
		if (res.status === 401) {
			return { authenticated: false };
		}
		throw new Error(`Whoami failed: ${res.status}`);
	}
	return res.json() as Promise<WhoamiResponse>;
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
		const res = await fetch(`${BASE_URL}/admin/ui-login`, {
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
		await fetch(`${BASE_URL}/admin/ui-logout`, {
			method: "POST",
			credentials: "include",
		});
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
