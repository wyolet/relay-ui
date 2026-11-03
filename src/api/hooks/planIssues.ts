import {
	type QueryClient,
	queryOptions,
	useQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { components, operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

export type PlanIssue = components["schemas"]["PlanIssue"];
export type PlanIssueRef = components["schemas"]["PlanIssueRef"];
export type PlanIssuesFilter = NonNullable<
	operations["plan_issues_list"]["parameters"]["query"]
>;

const PLAN_ISSUES_KEY = ["plan-issues"] as const;
// Relay rebuilds its plan just after a write lands.
const PLAN_REBUILD_DELAY_MS = 1_500;

/** `kind:id`, the form relay's `about`/`target` filters take. */
export function objectRef(kind: string, id: string): string {
	return `${kind}:${id}`;
}

/** Issues relay's plan engine records, narrowed by `filter`. */
export function planIssuesQueryOptions(filter: PlanIssuesFilter) {
	return queryOptions({
		queryKey: [...PLAN_ISSUES_KEY, filter] as const,
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

/** Every issue indexed by each object it is on or names, as `issuesByObject`. */
export function usePlanIssuesByObject(): ReadonlyMap<
	string,
	readonly PlanIssue[]
> {
	return (
		useQuery({ ...planIssuesQueryOptions({}), select: issuesByObject }).data ??
		NO_ISSUES_BY_OBJECT
	);
}

/** A page's issues in one call: those on any `about` object or naming one; nothing until it has ids. */
export function usePageIssues(about: readonly string[]): PlanIssue[] {
	return (
		useQuery({
			...planIssuesQueryOptions({ about: [...about] }),
			enabled: about.length > 0,
		}).data ?? []
	);
}

/**
 * Issues keyed by `kind:id` of each object they are on or name in their refs,
 * matching relay's `about` filter; an issue appears once per object.
 */
export function issuesByObject(
	issues: readonly PlanIssue[],
): Map<string, PlanIssue[]> {
	const byObject = new Map<string, PlanIssue[]>();
	for (const issue of issues) {
		const objects = new Set([objectRef(issue.kind, issue.id)]);
		for (const ref of issue.refs ?? []) {
			if (ref.id) objects.add(objectRef(ref.kind, ref.id));
		}
		for (const object of objects) {
			const list = byObject.get(object);
			if (list) list.push(issue);
			else byObject.set(object, [issue]);
		}
	}
	return byObject;
}

/** Re-reads issues now and once more after relay's plan has caught up with the write. */
export function refreshPlanIssues(queryClient: QueryClient): void {
	const invalidate = () =>
		void queryClient.invalidateQueries({ queryKey: PLAN_ISSUES_KEY });
	invalidate();
	setTimeout(invalidate, PLAN_REBUILD_DELAY_MS);
}

const NO_ISSUES_BY_OBJECT: ReadonlyMap<string, readonly PlanIssue[]> =
	new Map();
