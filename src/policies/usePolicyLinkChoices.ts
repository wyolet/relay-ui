import { type Budget, useBudgets, useUsableBudgets } from "@/api/hooks/budgets";
import { useHosts } from "@/api/hooks/hosts";
import { type Pool, usePools, useUsablePools } from "@/api/hooks/pools";
import type { Host } from "@/api/types/host";
import { displayLabel } from "@/lib/displayLabel";
import type { UnavailablePicks } from "@/lib/workContext";
import { poolCheckOptions } from "@/policies/poolCheckOptions";
import { poolMemberSummary } from "@/pools/poolKeys";
import type { CheckOption } from "@/shared/MultiSelect";

/** One linkable row (pool, budget) as the policy pickers show it. */
export interface LinkChoice {
	id: string;
	name: string;
	label: string;
	meta: string;
	host?: Host;
}

export interface LinkChoices {
	/** In the order of the selected ids; ids the list no longer has keep a bare row. */
	selected: LinkChoice[];
	available: LinkChoice[];
}

/** Selected rows are named from every readable row; the rest offer only what the owner may link. */
function splitChoices(
	all: readonly LinkChoice[],
	usable: readonly LinkChoice[],
	selectedIds: readonly string[],
): LinkChoices {
	const chosen = new Set(selectedIds);
	return {
		selected: selectedChoices(all, selectedIds),
		available: usable.filter((c) => !chosen.has(c.id)),
	};
}

function selectedChoices(
	all: readonly LinkChoice[],
	selectedIds: readonly string[],
): LinkChoice[] {
	const byId = new Map(all.map((c) => [c.id, c]));
	return selectedIds.map(
		(id) => byId.get(id) ?? { id, name: id, label: id, meta: "not found" },
	);
}

function poolChoice(pool: Pool, hosts: readonly Host[]): LinkChoice {
	const host = hosts.find((h) => h.metadata.id === pool.spec.hostId);
	return {
		id: pool.metadata.id ?? pool.metadata.name,
		name: pool.metadata.name,
		label: displayLabel(pool.metadata),
		meta: [
			host ? displayLabel(host.metadata) : pool.spec.hostId,
			pool.spec.selection ?? "prioritized",
			poolMemberSummary(pool),
		].join(" · "),
		host,
	};
}

function budgetChoice(budget: Budget): LinkChoice {
	const { amountUsd, period = "month", mode = "hard" } = budget.spec;
	return {
		id: budget.metadata.id ?? budget.metadata.name,
		name: budget.metadata.name,
		label: displayLabel(budget.metadata),
		meta: `$${amountUsd} / ${period} · ${mode}`,
	};
}

export function useSelectedPools(selectedIds: readonly string[]): LinkChoice[] {
	const { data: pools } = usePools();
	const { data: hosts } = useHosts();
	const hostItems = hosts.items ?? [];
	return selectedChoices(
		(pools.items ?? []).map((p) => poolChoice(p, hostItems)),
		selectedIds,
	);
}

/**
 * The policy form's pool check list. `usableBy` is the policy owner's scope as
 * the list filter takes it; `warnings` sit under a linked pool, keyed by id.
 */
export function usePoolCheckOptions(
	selectedIds: readonly string[],
	usableBy: string | undefined,
	warnings: ReadonlyMap<string, readonly string[]>,
	unavailable: UnavailablePicks | undefined,
): CheckOption[] {
	const { data: pools } = usePools();
	const { data: hosts } = useHosts();
	const usable = useUsablePools(usableBy).items;
	const hostItems = hosts.items ?? [];
	return poolCheckOptions({
		usable: usable.map((p) => poolChoice(p, hostItems)),
		linked: selectedChoices(
			(pools.items ?? []).map((p) => poolChoice(p, hostItems)),
			selectedIds,
		),
		warnings,
		unavailable,
	});
}

export function useSelectedBudgets(
	selectedIds: readonly string[],
): LinkChoice[] {
	const { data } = useBudgets();
	return selectedChoices((data.items ?? []).map(budgetChoice), selectedIds);
}

/** `usableBy` is the policy owner's scope as the list filter takes it. */
export function useBudgetChoices(
	selectedIds: readonly string[],
	usableBy: string | undefined,
): LinkChoices {
	const { data } = useBudgets();
	const usable = useUsableBudgets(usableBy).items;
	return splitChoices(
		(data.items ?? []).map(budgetChoice),
		usable.map(budgetChoice),
		selectedIds,
	);
}
