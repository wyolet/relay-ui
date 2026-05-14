import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

/**
 * GET /auth/whoami — returns { authenticated: boolean } on 200.
 * Any non-OK response means unauthenticated.
 */
async function fetchWhoami(): Promise<{ authenticated: boolean }> {
	const { data } = await apiClient.GET("/auth/whoami");
	return { authenticated: Boolean(data?.user_id) };
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

	async function login(username: string, password: string): Promise<void> {
		const { error } = await apiClient.POST("/auth/login", {
			body: { username, password },
		});
		if (error) {
			// Backend returns a structured error with a human-readable message.
			throw new AuthError(error.error.message || "Login failed.");
		}
		await queryClient.invalidateQueries({
			queryKey: whoamiQueryOptions.queryKey,
		});
	}

	async function logout(): Promise<void> {
		await apiClient.POST("/auth/logout");
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
