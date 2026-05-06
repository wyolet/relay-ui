/**
 * Hook for generating the Relay master key (PER-280).
 *
 * Backend assumption: GET /admin/master-key/generate returns { key: string }.
 * This is the ONLY endpoint that ever returns a master key in cleartext.
 * The operator must store the key immediately; it is never returned again.
 */

import { useMutation } from "@tanstack/react-query";
import { adminGet } from "#/api/fetch";

export interface MasterKeyResponse {
	key: string;
}

export function useGenerateMasterKey() {
	return useMutation({
		mutationFn: () => adminGet<MasterKeyResponse>("/admin/master-key/generate"),
	});
}
