import {
	type QueryClient,
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { whoamiQueryOptions } from "@/api/auth";
import { apiClient } from "@/api/client";
import { myContextsQueryOptions } from "@/api/hooks/contexts";
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

/**
 * Refetches what a personal-account switch changes: users' effective state,
 * the caller's whoami and the contexts it lists (Personal comes and goes).
 */
export function invalidatePersonalAccountReads(
	queryClient: QueryClient,
): Promise<void> {
	return Promise.all([
		queryClient.invalidateQueries({ queryKey: usersListQueryOptions.queryKey }),
		queryClient.invalidateQueries({ queryKey: whoamiQueryOptions.queryKey }),
		queryClient.invalidateQueries({
			queryKey: myContextsQueryOptions.queryKey,
		}),
	]).then(() => undefined);
}

/** Sets the user's own personal-account value; "" hands it back to their groups and the setting. */
export function useUpdateUserPersonalAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			personalAccount,
		}: {
			id: string;
			personalAccount: NonNullable<
				components["schemas"]["userUpdateInputBody"]["personalAccount"]
			>;
		}): Promise<void> => {
			unwrap(
				await apiClient.PUT("/users/by-id/{id}", {
					params: { path: { id } },
					body: { personalAccount },
				}),
			);
		},
		// The answer's effective state lags the write; re-read rather than trust it.
		onSuccess: () => invalidatePersonalAccountReads(queryClient),
	});
}
