import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

/**
 * GET /admin/whoami — returns { authenticated: boolean } on 200.
 * Any non-OK response means unauthenticated.
 */
async function fetchWhoami(): Promise<{ authenticated: boolean }> {
	const { data } = await apiClient.GET("/admin/whoami");
	return { authenticated: data?.authenticated ?? false };
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
		const { error } = await apiClient.POST("/admin/login", {
			body: { token },
		});
		if (error) {
			const status = error.error.type === "authentication_error" ? 401 : 0;
			if (status === 401) {
				throw new AuthError(
					"Invalid token. Check `RELAY_ADMIN_TOKEN` on your relay deployment.",
				);
			}
			throw new Error(`Login failed: ${error.error.message}`);
		}
		await queryClient.invalidateQueries({
			queryKey: whoamiQueryOptions.queryKey,
		});
	}

	async function logout(): Promise<void> {
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
