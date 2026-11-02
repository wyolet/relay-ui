import type {
	PolicyBudgetLink,
	PolicyRateLimitLink,
	PolicySpec,
} from "@/api/types/policy";

export interface RateLimitLinkValue {
	rateLimitId: string;
	models: string[];
	shared: boolean;
}

export interface BudgetLinkValue {
	budgetId: string;
	shared: boolean;
}

export interface PolicySpecValues {
	poolIds: string[];
	/** Empty allows every model the policy's pools serve. */
	models: string[];
	rateLimits: RateLimitLinkValue[];
	budgets: BudgetLinkValue[];
	enabled: boolean;
}

function listOrNull<T>(items: T[]): T[] | null {
	return items.length > 0 ? items : null;
}

export function specFromFormValues(values: PolicySpecValues): PolicySpec {
	return {
		enabled: values.enabled,
		poolIds: listOrNull(values.poolIds),
		models: values.models,
		rateLimits: listOrNull(
			values.rateLimits
				.filter((l) => l.rateLimitId)
				.map((l) => ({
					rateLimitId: l.rateLimitId,
					models: listOrNull(l.models),
					shared: l.shared,
				})),
		),
		budgets: listOrNull(
			values.budgets.map((b) => ({ budgetId: b.budgetId, shared: b.shared })),
		),
	};
}

export function specToFormValues(spec: PolicySpec): PolicySpecValues {
	return {
		poolIds: spec.poolIds ?? [],
		models: spec.models ?? [],
		rateLimits: (spec.rateLimits ?? []).map((l) => ({
			rateLimitId: l.rateLimitId,
			models: l.models ?? [],
			shared: l.shared ?? true,
		})),
		budgets: (spec.budgets ?? []).map((b) => ({
			budgetId: b.budgetId,
			shared: b.shared ?? true,
		})),
		enabled: spec.enabled ?? true,
	};
}

/** Budget links for `ids` in that order, keeping each kept link's `shared`;
 * a newly added budget starts shared. */
export function budgetLinksForIds(
	ids: readonly string[],
	links: readonly BudgetLinkValue[],
): BudgetLinkValue[] {
	const sharedById = new Map(links.map((l) => [l.budgetId, l.shared]));
	return ids.map((budgetId) => ({
		budgetId,
		shared: sharedById.get(budgetId) ?? true,
	}));
}

/** The `shared` flag of the spec link a resolved rate-limit row came from:
 * same rate limit and same model scope, else the first link to that limit. */
export function rateLimitRowShared(
	links: readonly PolicyRateLimitLink[],
	row: { id: string; models?: readonly string[] | null },
): boolean {
	const scope = sortedKey(row.models ?? []);
	const sameLimit = links.filter((l) => l.rateLimitId === row.id);
	const link =
		sameLimit.find((l) => sortedKey(l.models ?? []) === scope) ?? sameLimit[0];
	return link?.shared ?? true;
}

export function budgetLinkShared(
	links: readonly PolicyBudgetLink[],
	budgetId: string,
): boolean {
	return links.find((l) => l.budgetId === budgetId)?.shared ?? true;
}

function sortedKey(models: readonly string[]): string {
	return [...models].sort().join(",");
}

/** Moves the item at `from` one step up (-1) or down (+1); out-of-range is a no-op. */
export function moveItem<T>(
	items: readonly T[],
	from: number,
	step: -1 | 1,
): T[] {
	const to = from + step;
	const next = [...items];
	const moved = next[from];
	const target = next[to];
	if (moved === undefined || target === undefined) return next;
	next[from] = target;
	next[to] = moved;
	return next;
}
