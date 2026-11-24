import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { PseudoRefusal } from "@/api/types/errors";
import type { components } from "@/api/types.gen";
import { DRY_RUN_META } from "@/pseudo/dryRunMeta";

export type PseudoLimits = components["schemas"]["Limits"];
export type PseudoLimitsAnswer = components["schemas"]["PseudoLimitsAnswer"];
export type PseudoLimitsTarget = components["schemas"]["Target"];

/** The dry run answers 200 and the write 201, with the same body; a refusal throws a {@link PseudoRefusal}. */
async function postPseudoLimits(
	body: PseudoLimits,
	dryRun: boolean,
): Promise<PseudoLimitsAnswer> {
	const { data, error, response } = await apiClient.POST("/pseudo-limits", {
		body,
		params: { query: dryRun ? { dryRun } : {} },
	});
	if (error === undefined) return data;
	throw new PseudoRefusal(response.status, error);
}

/**
 * The policy the target's account is under now, as `case` and `current`: a
 * dry run with no limit. A policy set above the caller is a 403 refusal.
 */
export function pseudoLimitsCurrentQuery(target: PseudoLimitsTarget) {
	return queryOptions({
		queryKey: ["pseudo-limits", "current", target.kind, target.id] as const,
		queryFn: () => postPseudoLimits({ spec: { target } }, true),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/** Makes the limit and links it on the target's policy in one request; a refusal writes nothing. */
export function useCreatePseudoLimits() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: PseudoLimits) => postPseudoLimits(body, false),
		onSuccess: () => {
			queryClient.removeQueries({ queryKey: ["pseudo-limits"] });
			for (const key of [
				["budgets"],
				["ratelimits"],
				["policies"],
				["policy-bindings"],
				["accounts"],
			]) {
				void queryClient.invalidateQueries({ queryKey: key });
			}
		},
	});
}

/** What the request would make and change, with throwaway ids. */
export function useDryRunPseudoLimits() {
	return useMutation({
		meta: DRY_RUN_META,
		mutationFn: (body: PseudoLimits) => postPseudoLimits(body, true),
	});
}
