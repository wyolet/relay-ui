import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { PseudoRefusal } from "@/api/types/errors";
import type { components } from "@/api/types.gen";

export type PseudoHostKey = components["schemas"]["HostKeyForm"];
export type PseudoHostKeyCreated =
	components["schemas"]["PseudoHostKeyCreated"];

/** The dry run answers 200 and the write 201, with the same body; a refusal throws a {@link PseudoRefusal}. */
async function postPseudoHostKey(
	body: PseudoHostKey,
	dryRun: boolean,
): Promise<PseudoHostKeyCreated> {
	const { data, error, response } = await apiClient.POST("/pseudo-host-keys", {
		body,
		params: { query: dryRun ? { dryRun } : {} },
	});
	if (error === undefined) return data;
	throw new PseudoRefusal(response.status, error);
}

/** Checks the key with the provider, then makes the account, its tier binding, the key and the shares in one request; a refusal writes nothing. */
export function useCreatePseudoHostKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: PseudoHostKey) => postPseudoHostKey(body, false),
		onSuccess: () => {
			for (const key of [["accounts"], ["host-keys"], ["policy-bindings"]]) {
				void queryClient.invalidateQueries({ queryKey: key });
			}
		},
	});
}

/** What the request would make, after the same provider check, without storing the key. */
export function useDryRunPseudoHostKey() {
	return useMutation({
		mutationFn: (body: PseudoHostKey) => postPseudoHostKey(body, true),
	});
}
