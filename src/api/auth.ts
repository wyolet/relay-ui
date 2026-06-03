import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { apiClient } from "./client";

interface Whoami {
	authenticated: boolean;
	userId?: string;
	username?: string;
}

/**
 * GET /auth/whoami — returns { user_id, username } on 200.
 * Any non-OK response means unauthenticated.
 */
async function fetchWhoami(): Promise<Whoami> {
	const { data } = await apiClient.GET("/auth/whoami");
	return {
		authenticated: Boolean(data?.user_id),
		userId: data?.user_id,
		username: data?.username,
	};
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
	const navigate = useNavigate();

	const { data } = useQuery(whoamiQueryOptions);
	const authenticated = data?.authenticated ?? false;
	const username = data?.username;
	const userId = data?.userId;

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
		// Reflect the signed-out state immediately so the root auth guard sees it,
		// then drop all cached account-scoped data and route to /login. Without the
		// navigate, beforeLoad never re-runs and the user stays on the page.
		queryClient.setQueryData<Whoami>(whoamiQueryOptions.queryKey, {
			authenticated: false,
		});
		await navigate({ to: "/login" });
		queryClient.clear();
	}

	return { authenticated, username, userId, login, logout };
}

export class AuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AuthError";
	}
}
