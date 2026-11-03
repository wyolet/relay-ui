import type { Account } from "@/api/hooks/accounts";
import type { Binding } from "@/api/hooks/bindings";
import { bindingsByHost, bindingsByModel } from "@/api/hooks/bindings";
import type { Pool } from "@/api/hooks/pools";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import type { Key } from "@/api/types/key";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import type { Provider } from "@/api/types/provider";
import type { RateLimit } from "@/api/types/ratelimit";
import type { DiagnosticGraph } from "./types";

interface GraphInput {
	/** Unloaded or unreadable accounts leave pool accounts counted as serving. */
	accounts: Account[];
	policies: Policy[];
	hostKeys: HostKey[];
	hosts: Host[];
	models: Model[];
	rateLimits: RateLimit[];
	pools: Pool[];
	keys: Key[];
	providers: Provider[];
	bindings: Binding[];
}

function byId<T extends { metadata: { id?: string } }>(
	items: T[],
): Map<string, T> {
	const out = new Map<string, T>();
	for (const item of items) {
		if (item.metadata.id) out.set(item.metadata.id, item);
	}
	return out;
}

/** What pool reach reads: the pools, and each account's keys the caller can list. */
interface PoolReachSource {
	pools: ReadonlyMap<string, Pool>;
	hostKeysByAccountId: ReadonlyMap<string, readonly HostKey[]>;
	accounts: ReadonlyMap<string, Account>;
}

/**
 * Credentials a policy draws on, in failover order without repeats: each
 * pool's accounts' keys first, then its single keys. Pools the graph lacks add nothing.
 */
export function policyCredentialIds(
	policy: Policy,
	source: PoolReachSource,
): string[] {
	const ids = new Set<string>();
	for (const poolId of policy.spec.poolIds ?? []) {
		const pool = source.pools.get(poolId);
		for (const accountId of pool?.spec.accountIds ?? []) {
			for (const hk of source.hostKeysByAccountId.get(accountId) ?? []) {
				if (hk.metadata.id) ids.add(hk.metadata.id);
			}
		}
		for (const id of pool?.spec.credentialIds ?? []) ids.add(id);
	}
	return [...ids];
}

/**
 * Hosts a policy reaches through pool accounts whose keys the caller can't list:
 * a shared account (its keys sit in the real account) or one it can't read.
 * Relay reports a share that lost its account as a plan issue; here they count as serving.
 */
export function policyUnlistedAccountHostIds(
	policy: Policy,
	source: PoolReachSource,
): string[] {
	const hostIds = new Set<string>();
	for (const poolId of policy.spec.poolIds ?? []) {
		const pool = source.pools.get(poolId);
		if (!pool) continue;
		for (const accountId of pool.spec.accountIds ?? []) {
			const account = source.accounts.get(accountId);
			if (!account || account.spec.sourceAccountId)
				hostIds.add(pool.spec.hostId);
		}
	}
	return [...hostIds];
}

function keysByAccountId(hostKeys: readonly HostKey[]): Map<string, HostKey[]> {
	const out = new Map<string, HostKey[]>();
	for (const hk of hostKeys) {
		const id = hk.spec.accountId;
		if (!id) continue;
		const list = out.get(id);
		if (list) list.push(hk);
		else out.set(id, [hk]);
	}
	return out;
}

export function buildDiagnosticGraph(input: GraphInput): DiagnosticGraph {
	const pools = byId(input.pools);
	const accounts = byId(input.accounts);
	const hostKeysByAccountId = keysByAccountId(input.hostKeys);
	const reach = { pools, accounts, hostKeysByAccountId };
	const policiesByCredentialId = new Map<string, Policy[]>();
	const policiesByRateLimitId = new Map<string, Policy[]>();
	for (const p of input.policies) {
		for (const credId of policyCredentialIds(p, reach)) {
			const list = policiesByCredentialId.get(credId);
			if (list) list.push(p);
			else policiesByCredentialId.set(credId, [p]);
		}
		for (const rl of p.spec.rateLimits ?? []) {
			const list = policiesByRateLimitId.get(rl.rateLimitId);
			if (list) list.push(p);
			else policiesByRateLimitId.set(rl.rateLimitId, [p]);
		}
	}

	return {
		accounts,
		hostKeysByAccountId,
		policies: byId(input.policies),
		hostKeys: byId(input.hostKeys),
		hosts: byId(input.hosts),
		models: byId(input.models),
		rateLimits: byId(input.rateLimits),
		pools,
		keys: byId(input.keys),
		providers: byId(input.providers),
		bindingsByModel: bindingsByModel(input.bindings),
		bindingsByHost: bindingsByHost(input.bindings),
		policiesByCredentialId,
		policiesByRateLimitId,
	};
}
