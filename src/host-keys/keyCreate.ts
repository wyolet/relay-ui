import type { Pool } from "@/api/hooks/pools";
import { ApiError, isStaleResourceVersion } from "@/api/types/errors";
import { displayLabel } from "@/lib/displayLabel";
import { NEW_ACCOUNT } from "./hostKeyAccount";

export interface KeyPoolChoice {
	id: string;
	label: string;
	/** The pool lists the key's account, so it already draws on the key. */
	implied: boolean;
}

/** The pools at the host a new key may join; `accountId` is unset for a new account. */
export function keyPoolChoices(
	pools: readonly Pool[],
	hostId: string,
	accountId: string | undefined,
): KeyPoolChoice[] {
	return pools.flatMap((p) =>
		p.metadata.id && p.spec.hostId === hostId
			? [
					{
						id: p.metadata.id,
						label: displayLabel(p.metadata),
						implied:
							accountId !== undefined &&
							(p.spec.accountIds ?? []).includes(accountId),
					},
				]
			: [],
	);
}

/** The pool as loaded, with the key appended to its credentials. */
export function poolWithKey(pool: Pool, keyId: string): Pool {
	const ids = pool.spec.credentialIds ?? [];
	return {
		metadata: pool.metadata,
		spec: {
			...pool.spec,
			credentialIds: ids.includes(keyId) ? ids : [...ids, keyId],
		},
	};
}

export interface NewAccountDraft {
	hostId: string;
	displayName: string;
	orgId: string;
}

export interface KeyCreatePlan {
	/** Set when the key joins an account made with it. */
	newAccount?: NewAccountDraft;
	accountId?: string;
	/** Pools to append the key to, in order. */
	poolIds: string[];
}

interface KeyCreateInput {
	accountId: string;
	hostId: string;
	newAccountName: string;
	newAccountOrgId: string;
	poolIds: readonly string[];
}

/** What a create submits, skipping pools that already reach the key through its account. */
export function keyCreatePlan(
	input: KeyCreateInput,
	choices: readonly KeyPoolChoice[],
): KeyCreatePlan {
	const offered = new Set(choices.filter((c) => !c.implied).map((c) => c.id));
	const poolIds = input.poolIds.filter((id) => offered.has(id));
	if (input.accountId === NEW_ACCOUNT) {
		return {
			newAccount: {
				hostId: input.hostId,
				displayName: input.newAccountName.trim(),
				orgId: input.newAccountOrgId.trim(),
			},
			poolIds,
		};
	}
	return {
		...(input.accountId ? { accountId: input.accountId } : {}),
		poolIds,
	};
}

export interface KeyCreateEffects<K> {
	createAccount: (draft: NewAccountDraft) => Promise<string>;
	createKey: (accountId: string | undefined) => Promise<K>;
	deleteAccount: (id: string) => Promise<unknown>;
	addKeyToPool: (poolId: string, keyId: string) => Promise<unknown>;
}

export interface PoolFailure {
	poolId: string;
	error: unknown;
}

/**
 * Runs the plan: the account, then the key, then each pool in turn. A failed
 * key create removes the account made for it and rethrows; a failed pool
 * update is collected and the rest still run.
 */
export async function runKeyCreate<K extends { metadata: { id?: string } }>(
	plan: KeyCreatePlan,
	effects: KeyCreateEffects<K>,
): Promise<{ key: K; poolFailures: PoolFailure[] }> {
	const createdAccountId = plan.newAccount
		? await effects.createAccount(plan.newAccount)
		: undefined;
	let key: K;
	try {
		key = await effects.createKey(createdAccountId ?? plan.accountId);
	} catch (err) {
		if (createdAccountId) {
			await effects.deleteAccount(createdAccountId).catch(() => undefined);
		}
		throw err;
	}
	const keyId = key.metadata.id;
	const poolFailures: PoolFailure[] = [];
	for (const poolId of plan.poolIds) {
		try {
			if (!keyId) throw new Error("Relay returned the key without an id.");
			await effects.addKeyToPool(poolId, keyId);
		} catch (error) {
			poolFailures.push({ poolId, error });
		}
	}
	return { key, poolFailures };
}

export function poolFailureMessage(poolLabel: string, error: unknown): string {
	const reason = isStaleResourceVersion(error)
		? "the pool changed since this form loaded it. Add the key on the pool's page."
		: error instanceof ApiError
			? error.body.message
			: error instanceof Error
				? error.message
				: "the update failed.";
	return `Key created, but adding it to pool "${poolLabel}" failed: ${reason}`;
}
