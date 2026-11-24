import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { PseudoRefusal } from "@/api/types/errors";
import type { components } from "@/api/types.gen";

export type PseudoAccess = components["schemas"]["Access"];
export type PseudoAccessAnswer = components["schemas"]["PseudoAccessAnswer"];
export type PseudoAccessTarget = components["schemas"]["Target"];
export type PolicyCurrent = components["schemas"]["PolicyCurrent"];
export type CurrentPool = components["schemas"]["CurrentPool"];
export type AccessCase = PseudoAccessAnswer["case"];

/** The dry run answers 200, the write 201 (200 when nothing needed writing); a refusal throws a {@link PseudoRefusal}. */
async function postPseudoAccess(
	body: PseudoAccess,
	dryRun: boolean,
): Promise<PseudoAccessAnswer> {
	const { data, error, response } = await apiClient.POST("/pseudo-access", {
		body,
		params: { query: dryRun ? { dryRun } : {} },
	});
	if (error === undefined) return data;
	throw new PseudoRefusal(response.status, error);
}

/**
 * The target's case and current access, from a dry run with the change
 * omitted. Read once per open: the form states what it had then, and a
 * refetch would be another POST.
 */
export function pseudoAccessCurrentQuery(target: PseudoAccessTarget) {
	return queryOptions({
		queryKey: ["pseudo-access", "current", target.kind, target.id] as const,
		queryFn: () => postPseudoAccess({ spec: { target } }, true),
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 0,
	});
}

export function usePseudoAccessCurrent(
	target: PseudoAccessTarget,
	{ enabled }: { enabled: boolean },
) {
	return useQuery({ ...pseudoAccessCurrentQuery(target), enabled });
}

/** Sets the target's whole access in one request; a refusal writes nothing. */
export function useCreatePseudoAccess() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: PseudoAccess) => postPseudoAccess(body, false),
		onSuccess: () => {
			for (const key of [
				["accounts"],
				["pools"],
				["policies"],
				["policy-bindings"],
			]) {
				void queryClient.invalidateQueries({ queryKey: key });
			}
		},
	});
}

/** What the request would make, change and delete, with throwaway ids. */
export function useDryRunPseudoAccess() {
	return useMutation({
		mutationFn: (body: PseudoAccess) => postPseudoAccess(body, true),
	});
}
