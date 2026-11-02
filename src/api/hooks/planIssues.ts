import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

export type PlanIssue = components["schemas"]["PlanIssue"];
export type PlanIssueRef = components["schemas"]["PlanIssueRef"];

/** Issues relay's plan engine records; `kind` + `id` narrow to one object. */
export function planIssuesQueryOptions(filter: { kind?: string; id?: string }) {
	return queryOptions({
		queryKey: ["plan-issues", filter] as const,
		queryFn: async (): Promise<PlanIssue[]> =>
			unwrap(
				await apiClient.GET("/plan-issues", { params: { query: filter } }),
			) ?? [],
		staleTime: 30_000,
		gcTime: 5 * 60_000,
		// Optional read: a relay without it, or a caller without the grant, sees none.
		retry: false,
	});
}

/** Every recorded issue. Non-suspending: issues never block a page. */
export function usePlanIssues(): PlanIssue[] {
	return useQuery(planIssuesQueryOptions({})).data ?? [];
}

/** One object's issues; nothing until its id is known. */
export function useObjectPlanIssues(
	kind: string,
	id: string | undefined,
): PlanIssue[] {
	return (
		useQuery({
			...planIssuesQueryOptions({ kind, id }),
			enabled: id !== undefined && id !== "",
		}).data ?? []
	);
}
