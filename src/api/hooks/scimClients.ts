import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

export type ScimClient = components["schemas"]["SCIMClientRow"];
/** A create or rotate answer: the row plus the one-time bearer token. */
export type IssuedScimClient =
	components["schemas"]["scimClientCreateOutputBody"];

const SCIM_CLIENTS_KEY = ["scim-clients"] as const;

export const scimClientsQueryOptions = queryOptions({
	queryKey: SCIM_CLIENTS_KEY,
	queryFn: async (): Promise<ScimClient[]> => {
		const data = unwrap(await apiClient.GET("/scim-clients"));
		return data.clients ?? [];
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
	// A 403 is a permanent answer for this actor, not a transient failure.
	retry: false,
});

export function useScimClients() {
	return useSuspenseQuery(scimClientsQueryOptions);
}

// Create and rotate answer with a token the server never returns again. The
// list is refetched rather than patched from the answer, and gcTime 0 drops the
// finished mutation (and the token in its state) once the caller resets it.
export function useCreateScimClient() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (name: string): Promise<IssuedScimClient> =>
			unwrap(await apiClient.POST("/scim-clients", { body: { name } })),
		gcTime: 0,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: SCIM_CLIENTS_KEY });
		},
	});
}

export function useRotateScimClient() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (name: string): Promise<IssuedScimClient> =>
			unwrap(
				await apiClient.POST("/scim-clients/{name}/rotate", {
					params: { path: { name } },
				}),
			),
		gcTime: 0,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: SCIM_CLIENTS_KEY });
		},
	});
}

export function useRevokeScimClient() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (name: string): Promise<void> => {
			unwrap(
				await apiClient.POST("/scim-clients/{name}/revoke", {
					params: { path: { name } },
				}),
			);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: SCIM_CLIENTS_KEY });
		},
	});
}
