import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { PseudoRefusal } from "@/api/types/errors";
import type { components } from "@/api/types.gen";
import { DRY_RUN_META } from "@/pseudo/dryRunMeta";

export type PseudoAgent = components["schemas"]["Agent"];
export type PseudoAgentCreated = components["schemas"]["PseudoAgentCreated"];

/** The dry run answers 200 and the write 201, with the same body; a refusal throws a {@link PseudoRefusal}. */
async function postPseudoAgent(
	body: PseudoAgent,
	dryRun: boolean,
): Promise<PseudoAgentCreated> {
	const { data, error, response } = await apiClient.POST("/pseudo-agents", {
		body,
		params: { query: dryRun ? { dryRun } : {} },
	});
	if (error === undefined) return data;
	throw new PseudoRefusal(response.status, error);
}

/** Makes the agent's rows in one request; a refusal writes nothing. */
export function useCreatePseudoAgent() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: PseudoAgent) => postPseudoAgent(body, false),
		onSuccess: () => {
			for (const key of [
				["service-accounts"],
				["accounts"],
				["pools"],
				["policies"],
				["policy-bindings"],
				["keys"],
				["projects"],
			]) {
				void queryClient.invalidateQueries({ queryKey: key });
			}
		},
	});
}

/** What the request would make, with throwaway ids and no key plaintext. */
export function useDryRunPseudoAgent() {
	return useMutation({
		meta: DRY_RUN_META,
		mutationFn: (body: PseudoAgent) => postPseudoAgent(body, true),
	});
}
