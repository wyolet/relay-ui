import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { DetachedLinks } from "@/api/types/errors";
import type { components, operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

export type Budget = components["schemas"]["Budget"];
export type BudgetSpec = components["schemas"]["BudgetSpec"];
export type BudgetList = components["schemas"]["BudgetList"];
/** Server-side filter/sort/page params accepted by GET /budgets. */
export type BudgetsListParams = NonNullable<
	operations["list_budgets"]["parameters"]["query"]
>;

export const budgetListQueryOptions = queryOptions({
	queryKey: ["budgets"] as const,
	queryFn: async (): Promise<BudgetList> =>
		unwrap(await apiClient.GET("/budgets")),
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function budgetListQuery(params: BudgetsListParams) {
	return queryOptions({
		queryKey: ["budgets", "list", params] as const,
		queryFn: async (): Promise<BudgetList> =>
			unwrap(await apiClient.GET("/budgets", { params: { query: params } })),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function budgetDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["budgets", ref] as const,
		queryFn: async (): Promise<Budget> =>
			unwrap(
				await apiClient.GET("/budgets/{ref}", { params: { path: { ref } } }),
			),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function budgetReferencesQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["budgets", "references", id] as const,
		queryFn: async () =>
			unwrap(
				await apiClient.GET("/budgets/by-id/{id}/references", {
					params: { path: { id } },
				}),
			),
		enabled: id.length > 0,
		staleTime: 10_000,
	});
}

function invalidateBudgetDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	for (const key of [["budgets"], ["policies"]]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
}

export function useBudgets() {
	return useSuspenseQuery(budgetListQueryOptions);
}

export function useBudgetsList(params: BudgetsListParams) {
	return useSuspenseQuery(budgetListQuery(params));
}

export function useBudget(ref: string) {
	return useSuspenseQuery(budgetDetailQueryOptions(ref));
}

export function useBudgetReferences(id: string | undefined) {
	return useSuspenseQuery(budgetReferencesQueryOptions(id ?? ""));
}

export function useCreateBudget() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: Budget): Promise<Budget> =>
			unwrap(await apiClient.POST("/budgets", { body })),
		onSuccess: () => invalidateBudgetDependents(queryClient),
	});
}

export function useUpdateBudget() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: Budget;
		}): Promise<Budget> =>
			unwrap(
				await apiClient.PUT("/budgets/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			),
		onSuccess: () => invalidateBudgetDependents(queryClient),
	});
}

/** Resolves to the links the delete took from rows that stay (empty on 204). */
export function useDeleteBudget() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<DetachedLinks[]> => {
			const data = unwrap(
				await apiClient.DELETE("/budgets/by-id/{id}", {
					params: { path: { id } },
				}),
			);
			return data?.detached ?? [];
		},
		onSuccess: () => invalidateBudgetDependents(queryClient),
	});
}
