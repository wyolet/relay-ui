import { useQueries, useQuery } from "@tanstack/react-query";
import { useBudget } from "@/api/hooks/budgets";
import {
	type PolicyModelView,
	policiesListQueryOptions,
	policyModelsQueryOptions,
} from "@/api/hooks/policies";
import type { Policy } from "@/api/types/policy";
import { displayLabel } from "@/lib/displayLabel";
import { type UnpricedGrant, unpricedGrants } from "@/lib/pricingMatrix";
import { useSelectedBudgets } from "@/policies/usePolicyLinkChoices";
import { type ModelPrices, useModelPrices } from "@/pricing/useModelPrices";

/** The policy's unpriced grants from relay's resolved (model, host) rows. */
function unpricedOf(
	prices: ModelPrices,
	rows: readonly PolicyModelView[],
): UnpricedGrant[] {
	return unpricedGrants(
		prices,
		rows.map((r) => ({
			model: {
				id: r.model.id,
				slug: r.model.name,
				label: displayLabel(r.model),
			},
			host: { id: r.host.id, slug: r.host.name, label: displayLabel(r.host) },
		})),
	);
}

/**
 * Granted models some reached host serves unpriced, and the budgets that
 * refuse them; null without budgets or gaps. Grants are the saved policy's
 * (relay resolves them), so a draft's model or pool edits show after save.
 */
export function useUnpricedUnderBudget(
	ref: string | undefined,
	budgetIds: readonly string[],
): { grants: UnpricedGrant[]; budgets: string[] } | null {
	const budgets = useSelectedBudgets(budgetIds);
	const { data } = useQuery({
		...policyModelsQueryOptions(ref ?? ""),
		enabled: ref != null && budgetIds.length > 0,
	});
	const prices = useModelPrices();
	if (budgetIds.length === 0 || !data || !prices) return null;
	const grants = unpricedOf(prices, data.models ?? []);
	if (grants.length === 0) return null;
	return { grants, budgets: budgets.map((b) => b.label) };
}

export interface BudgetCover {
	policy: Policy;
	/** Unpriced granted models; undefined while it resolves. */
	unpriced: number | undefined;
}

/** Policies linking the budget, each with its count of unpriced grants;
 * undefined until the policy list loads. */
export function useBudgetCovers(budgetName: string): BudgetCover[] | undefined {
	const budgetId = useBudget(budgetName).data.metadata.id;
	const { data: policies } = useQuery(policiesListQueryOptions);
	const linking = (policies?.items ?? []).filter((p) =>
		(p.spec.budgets ?? []).some((b) => b.budgetId === budgetId),
	);
	const grants = useQueries({
		queries: linking.map((p) => policyModelsQueryOptions(p.metadata.name)),
	});
	const prices = useModelPrices();
	if (!policies) return undefined;
	return linking.map((policy, i) => {
		const rows = grants[i]?.data?.models;
		return {
			policy,
			unpriced: rows && prices ? unpricedOf(prices, rows).length : undefined,
		};
	});
}
