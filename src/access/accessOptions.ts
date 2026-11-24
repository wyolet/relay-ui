import type { AgentAccount } from "@/agents/agentAccounts";
import type { Pool } from "@/api/hooks/pools";
import type { Host } from "@/api/types/host";
import type { Policy } from "@/api/types/policy";
import { displayLabel } from "@/lib/displayLabel";

/** The hosts that take no key: relay ignores a pool's accounts there. */
export function keylessHostIds(hosts: readonly Host[]): Set<string> {
	return new Set(
		hosts.flatMap((h) =>
			h.spec.noAuth && h.metadata.id ? [h.metadata.id] : [],
		),
	);
}

/** The accounts the form may offer: none at a host that takes no key. */
export function offeredAccounts(
	accounts: readonly AgentAccount[],
	keyless: ReadonlySet<string>,
): AgentAccount[] {
	return accounts.filter((a) => !keyless.has(a.hostId));
}

/** A pool of the current policy the form can't stand for by its accounts, linked as it is unless dropped. */
export interface KeptPool {
	id: string;
	label: string;
	/** Why the form keeps it whole. */
	hint: string;
	/** Unset when the caller can't see the pool. */
	hostId?: string;
}

/** The access fields as the current policy fills them. */
export interface AccessPrefill {
	everyCredential: boolean;
	/** The accounts of the pools the form stands for, in pool order. */
	accountIds: string[];
	keptPools: KeptPool[];
	models: string[];
}

function keptPoolHint(
	pool: Pool,
	hostLabel: string,
	keyless: ReadonlySet<string>,
): string {
	if (keyless.has(pool.spec.hostId)) {
		return `At ${hostLabel}, a host that takes no key.`;
	}
	if ((pool.spec.credentialIds ?? []).length > 0) {
		return `Lists single keys at ${hostLabel}.`;
	}
	if ((pool.spec.accountIds ?? []).length === 0) {
		return `Lists no accounts at ${hostLabel}.`;
	}
	return `Lists accounts at ${hostLabel} this form can't offer.`;
}

/**
 * The fields filled from the policy the target is under. A pool listing only
 * offered accounts is ticked as those accounts (the save makes a fresh pool for
 * them); any other pool is kept whole. A policy linking no pools reaches every
 * credential.
 */
export function accessPrefill(
	policy: Policy | undefined,
	pools: readonly Pool[],
	offered: readonly AgentAccount[],
	hostLabel: (hostId: string) => string,
	keyless: ReadonlySet<string>,
): AccessPrefill {
	const poolIds = policy?.spec.poolIds ?? [];
	const offeredIds = new Set(offered.map((a) => a.id));
	const accountIds: string[] = [];
	const keptPools: KeptPool[] = [];
	for (const id of poolIds) {
		const pool = pools.find((p) => p.metadata.id === id);
		if (!pool) {
			keptPools.push({
				id,
				label: `Pool ${id.slice(0, 8)}`,
				hint: "A pool you can't see.",
			});
			continue;
		}
		const listed = pool.spec.accountIds ?? [];
		const representable =
			(pool.spec.credentialIds ?? []).length === 0 &&
			listed.length > 0 &&
			listed.every((a) => offeredIds.has(a));
		if (representable) {
			for (const a of listed) if (!accountIds.includes(a)) accountIds.push(a);
			continue;
		}
		keptPools.push({
			id,
			label: displayLabel(pool.metadata),
			hint: keptPoolHint(pool, hostLabel(pool.spec.hostId), keyless),
			hostId: pool.spec.hostId,
		});
	}
	return {
		everyCredential: poolIds.length === 0,
		accountIds,
		keptPools,
		models: [...(policy?.spec.models ?? [])],
	};
}
