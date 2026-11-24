import type { AgentAccount } from "@/agents/agentAccounts";
import type { Pool } from "@/api/hooks/pools";
import type { Policy } from "@/api/types/policy";
import { displayLabel } from "@/lib/displayLabel";

/** A pool of the current policy the form can't stand for by its accounts, linked as it is unless dropped. */
export interface KeptPool {
	id: string;
	label: string;
	/** Why the form keeps it whole. */
	hint: string;
	/** Unset when the caller can't see the pool. */
	hostId?: string;
}

/** A pool of the current policy the form stands for by its accounts. */
export interface RepresentedPool {
	id: string;
	hostId: string;
	accountIds: string[];
}

/** The access fields as the current policy fills them. */
export interface AccessPrefill {
	everyCredential: boolean;
	/** The accounts of the pools the form stands for, in pool order. */
	accountIds: string[];
	keptPools: KeptPool[];
	representedPools: RepresentedPool[];
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
 * offered accounts is ticked as those accounts; any other pool is kept whole.
 * A policy linking no pools reaches every credential.
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
	const representedPools: RepresentedPool[] = [];
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
			representedPools.push({
				id,
				hostId: pool.spec.hostId,
				accountIds: [...listed],
			});
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
		representedPools,
		models: [...(policy?.spec.models ?? [])],
	};
}
