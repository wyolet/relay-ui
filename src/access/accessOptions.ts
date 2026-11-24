import type { AgentAccount, AgentPool } from "@/agents/agentAccounts";
import type { Pool } from "@/api/hooks/pools";
import type { CurrentPool, PolicyCurrent } from "@/api/hooks/pseudoAccess";
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

/** Why the form keeps a pool whole rather than stand for it by its accounts. */
type KeptReason =
	| "keyless"
	| "singleKeys"
	| "noAccounts"
	| "hiddenAccounts"
	| "madeElsewhere"
	| "unoffered";

const KEPT_HINTS: Record<KeptReason, (hostLabel: string) => string> = {
	keyless: (host) => `At ${host}, a host that takes no key.`,
	singleKeys: (host) => `Lists single keys at ${host}.`,
	noAccounts: (host) => `Lists no accounts at ${host}.`,
	hiddenAccounts: (host) => `Lists accounts at ${host} you can't see.`,
	madeElsewhere: (host) => `A pool at ${host} this form didn't make.`,
	unoffered: (host) => `Lists accounts at ${host} this form can't offer.`,
};

function keptPoolHint(
	pool: Pool,
	hostLabel: string,
	keyless: ReadonlySet<string>,
): string {
	const reason: KeptReason = keyless.has(pool.spec.hostId)
		? "keyless"
		: (pool.spec.credentialIds ?? []).length > 0
			? "singleKeys"
			: (pool.spec.accountIds ?? []).length === 0
				? "noAccounts"
				: "unoffered";
	return KEPT_HINTS[reason](hostLabel);
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

/** The fields as relay's dry run reads the current access, for the one-request path. */
export interface CurrentAccessPrefill extends AccessPrefill {
	/** The offered keyless-host pools the policy links, ticked in the Pools list. */
	poolIds: string[];
	/** The pools the policy links that the caller sees, in its order. */
	currentPoolIds: string[];
	/** Pools the policy links that the caller can't see; relay keeps them. */
	hiddenPools: number;
}

function currentKeptReason(
	pool: CurrentPool,
	offeredIds: ReadonlySet<string>,
	keyless: ReadonlySet<string>,
): KeptReason | undefined {
	const accounts = pool.accounts ?? [];
	if (keyless.has(pool.host.id)) return "keyless";
	if (pool.hiddenAccounts > 0) return "hiddenAccounts";
	if (accounts.length === 0) return "noAccounts";
	// Relay reuses only the pools it labelled; sending another pool's accounts makes a new pool.
	if (!pool.labelled) return "madeElsewhere";
	if (!accounts.every((a) => offeredIds.has(a.id))) return "unoffered";
	return undefined;
}

/**
 * The fields filled from relay's reading of the current access. An offered
 * keyless pool is ticked in the Pools list; a labelled pool listing only
 * offered accounts is ticked as those accounts; any other pool is kept whole.
 * No policy, or one linking no pools, reaches every credential.
 */
export function currentAccessPrefill(
	current: PolicyCurrent | undefined,
	offered: readonly AgentAccount[],
	offeredPools: readonly AgentPool[],
	hostLabel: (hostId: string) => string,
	keyless: ReadonlySet<string>,
): CurrentAccessPrefill {
	const offeredIds = new Set(offered.map((a) => a.id));
	const pools = current?.pools ?? [];
	const prefill: CurrentAccessPrefill = {
		everyCredential: current?.linksNoPools ?? true,
		accountIds: [],
		keptPools: [],
		representedPools: [],
		models: [...(current?.models ?? [])],
		poolIds: [],
		currentPoolIds: pools.map((p) => p.id),
		hiddenPools: current?.hiddenPools ?? 0,
	};
	for (const pool of pools) {
		if (offeredPools.some((p) => p.id === pool.id)) {
			prefill.poolIds.push(pool.id);
			continue;
		}
		const reason = currentKeptReason(pool, offeredIds, keyless);
		if (reason) {
			prefill.keptPools.push({
				id: pool.id,
				label: pool.name,
				hint: KEPT_HINTS[reason](hostLabel(pool.host.id) || pool.host.name),
				hostId: pool.host.id,
			});
			continue;
		}
		const accountIds = (pool.accounts ?? []).map((a) => a.id);
		for (const a of accountIds) {
			if (!prefill.accountIds.includes(a)) prefill.accountIds.push(a);
		}
		prefill.representedPools.push({
			id: pool.id,
			hostId: pool.host.id,
			accountIds,
		});
	}
	return prefill;
}

/** The line for pools relay keeps that the caller can't see; none for zero. */
export function hiddenPoolsLine(count: number | undefined): string | undefined {
	if (!count) return undefined;
	return count === 1
		? "1 more pool set by an admin stays."
		: `${count} more pools set by an admin stay.`;
}
