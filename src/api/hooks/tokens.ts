import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

/** A freshly minted inference token — the plaintext is returned once. */
export type MintedToken = components["schemas"]["mintTokenOutputBody"];

/** Mints a project-scoped inference token for the signed-in user. Session auth
 * only: a token names the user it was minted for. */
export function useMintToken() {
	return useMutation({
		mutationFn: async (vars: {
			project: string;
			ttl: string;
		}): Promise<MintedToken> => {
			const data = unwrap(await apiClient.POST("/auth/token", { body: vars }));
			return data;
		},
	});
}

/** Invalidates every inference token the caller holds. */
export function useRevokeAllTokens() {
	return useMutation({
		mutationFn: async (): Promise<void> => {
			unwrap(await apiClient.POST("/auth/token/revoke-all"));
		},
	});
}
