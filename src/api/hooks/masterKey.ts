/**
 * Hook for generating the Relay master key.
 *
 * GET /admin/master-key/generate returns MasterKeyResponse: { key: string }.
 * This is the ONLY endpoint that ever returns a master key in cleartext.
 * The operator must store the key immediately; it is never returned again.
 */

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";

export type MasterKeyResponse =
	components["schemas"]["masterKeyGenerateOutputBody"];

export function useGenerateMasterKey() {
	return useMutation({
		mutationFn: async (): Promise<MasterKeyResponse> => {
			const { data, error } = await apiClient.POST("/master-key/generate", {});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
	});
}
