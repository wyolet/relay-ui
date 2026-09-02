import {
	queryOptions,
	useMutation,
	useQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

/** An account row from GET /users — identity only, never credentials. */
export type UserRow = components["schemas"]["userRow"];

export const usersListQueryOptions = queryOptions({
	queryKey: ["users"] as const,
	queryFn: async (): Promise<UserRow[]> => {
		const data = unwrap(await apiClient.GET("/users"));
		return data.items ?? [];
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
	// A 403 is a permanent answer for this actor, not a transient failure.
	retry: false,
});

export function useUsers() {
	return useSuspenseQuery(usersListQueryOptions);
}

/**
 * Whether the current actor may list users — the nav entry hides when the
 * endpoint answers 403. Non-suspending, and the probe doubles as the list's
 * cache warm-up, so opening the page costs no second request.
 */
export function useCanListUsers(): boolean {
	const { error } = useQuery(usersListQueryOptions);
	return !(error instanceof ApiError && error.status === 403);
}

/** Look one account up by id, from the list the actor can already see. */
export function useUser(id: string): UserRow | undefined {
	const { data } = useUsers();
	return data.find((u) => u.id === id);
}

/** Bumps the user's token version: every inference token they hold stops
 * verifying. Nothing to invalidate — no registry of live tokens exists. */
export function useRevokeUserTokens() {
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.POST("/users/by-id/{id}/revoke-tokens", {
					params: { path: { id } },
				}),
			);
		},
	});
}
