import { type Budget, useBudgets } from "@/api/hooks/budgets";
import { useHostKeys } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import { type Pool, usePools } from "@/api/hooks/pools";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import { displayLabel } from "@/lib/displayLabel";

/** One linkable row (pool, budget, host key) as the policy pickers show it. */
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

function splitChoices(
	all: readonly LinkChoice[],
	selectedIds: readonly string[],
): LinkChoices {
	const byId = new Map(all.map((c) => [c.id, c]));
	const chosen = new Set(selectedIds);
	return {
		selected: selectedIds.map(
			(id) => byId.get(id) ?? { id, name: id, label: id, meta: "not found" },
		),
		available: all.filter((c) => !chosen.has(c.id)),
	};
}

function poolChoice(pool: Pool, hosts: readonly Host[]): LinkChoice {
	const host = hosts.find((h) => h.metadata.id === pool.spec.hostId);
	const keys = pool.spec.credentialIds?.length ?? 0;
	return {
		id: pool.metadata.id ?? pool.metadata.name,
		name: pool.metadata.name,
		label: displayLabel(pool.metadata),
		meta: [
			host ? displayLabel(host.metadata) : pool.spec.hostId,
			pool.spec.selection ?? "prioritized",
			`${keys} key${keys === 1 ? "" : "s"}`,
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

function hostKeyChoice(key: HostKey, hosts: readonly Host[]): LinkChoice {
	const host = hosts.find((h) => h.metadata.id === key.spec.hostId);
	return {
		id: key.metadata.id ?? key.metadata.name,
		name: key.metadata.name,
		label: displayLabel(key.metadata),
		meta: host ? displayLabel(host.metadata) : key.spec.hostId,
		host,
	};
}

export function usePoolChoices(selectedIds: readonly string[]): LinkChoices {
	const { data: pools } = usePools();
	const { data: hosts } = useHosts();
	const hostItems = hosts.items ?? [];
	return splitChoices(
		(pools.items ?? []).map((p) => poolChoice(p, hostItems)),
		selectedIds,
	);
}

export function useBudgetChoices(selectedIds: readonly string[]): LinkChoices {
	const { data } = useBudgets();
	return splitChoices((data.items ?? []).map(budgetChoice), selectedIds);
}

/** Host keys a policy links directly; read-only, shown only when present. */
export function useCredentialChoices(
	selectedIds: readonly string[],
): LinkChoice[] {
	const { data: keys } = useHostKeys();
	const { data: hosts } = useHosts();
	const hostItems = hosts.items ?? [];
	return splitChoices(
		(keys.items ?? []).map((k) => hostKeyChoice(k, hostItems)),
		selectedIds,
	).selected;
}
