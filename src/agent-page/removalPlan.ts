import type { Account } from "@/api/hooks/accounts";
import type { Pool } from "@/api/hooks/pools";
import type { Key } from "@/api/types/key";
import type { Policy } from "@/api/types/policy";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { AGENT_SA_TYPE, SA_TYPE_LABEL } from "@/lib/agentLabel";
import { displayLabel } from "@/lib/displayLabel";
import { accountBinding } from "@/policy-bindings/accountLookup";

export function isAgent(labels: Record<string, string> | undefined): boolean {
	return labels?.[SA_TYPE_LABEL] === AGENT_SA_TYPE;
}

/** One delete of an agent's removal, in the order relay accepts them. */
export type RemovalWrite = { id: string; label: string } & (
	| { kind: "key"; keyId: string }
	| { kind: "unbind"; accountId: string }
	| { kind: "serviceAccount"; serviceAccountId: string }
	| { kind: "policy"; policyId: string }
	| { kind: "pool"; poolId: string }
);

/** A policy or pool labelled for the agent that stays. */
export interface KeptRow {
	kind: "policy" | "pool";
	id: string;
	label: string;
	reason: string;
	/** Another row still uses it, so it can't be ticked for deletion. */
	inUse: boolean;
}

export interface RemovalPlan {
	deletes: RemovalWrite[];
	kept: KeptRow[];
}

export interface RemovalInput {
	serviceAccount: { id: string; label: string };
	keys: readonly Key[];
	/** The service account's own account; none once relay has closed it. */
	account: Account | undefined;
	bindings: readonly PolicyBinding[];
	/** Policies labelled `agent-id=<service account id>`. */
	labelledPolicies: readonly Policy[];
	/** Pools labelled `agent-id=<service account id>`. */
	labelledPools: readonly Pool[];
	/** Every visible policy, to find who else links a labelled pool. */
	policies: readonly Policy[];
	/** Labelled policy and pool ids the user unticked. */
	keptIds: ReadonlySet<string>;
}

function plural(n: number, noun: string): string {
	return `${n} other ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * Relay refuses the service account while a key or binding names it, and a
 * policy while it is bound; a pool deleted under a policy that links it
 * leaves a dead id in that policy. Hence keys, unbind, service account,
 * policies, pools.
 */
export function agentRemovalPlan(input: RemovalInput): RemovalPlan {
	const accountId = input.account?.metadata.id;
	const policyLabel = (id: string) => {
		const policy = input.policies.find((p) => p.metadata.id === id);
		return policy ? displayLabel(policy.metadata) : id;
	};
	const kept: KeptRow[] = [];

	const keys = input.keys.flatMap((k): RemovalWrite[] =>
		k.metadata.id
			? [
					{
						kind: "key",
						id: `key:${k.metadata.id}`,
						label: `Delete key ${displayLabel(k.metadata)}`,
						keyId: k.metadata.id,
					},
				]
			: [],
	);

	const binding = accountId
		? accountBinding(input.bindings, accountId)
		: undefined;
	const unbind: RemovalWrite[] =
		accountId && binding
			? [
					{
						kind: "unbind",
						id: "unbind",
						label: `Take the agent off policy ${policyLabel(binding.spec.policyId)}`,
						accountId,
					},
				]
			: [];

	const deletedPolicyIds = new Set<string>();
	const policies = input.labelledPolicies.flatMap((p): RemovalWrite[] => {
		const id = p.metadata.id;
		if (!id) return [];
		const label = displayLabel(p.metadata);
		const others = new Set(
			input.bindings
				.filter((b) => b.spec.policyId === id)
				.flatMap((b) => b.spec.accountIds ?? [])
				.filter((a) => a !== accountId),
		);
		if (others.size > 0) {
			kept.push({
				kind: "policy",
				id,
				label,
				reason: `used by ${plural(others.size, "account")}`,
				inUse: true,
			});
			return [];
		}
		if (input.keptIds.has(id)) {
			kept.push({
				kind: "policy",
				id,
				label,
				reason: "unticked",
				inUse: false,
			});
			return [];
		}
		deletedPolicyIds.add(id);
		return [
			{
				kind: "policy",
				id: `policy:${id}`,
				label: `Delete policy ${label}`,
				policyId: id,
			},
		];
	});

	const linking = [...input.policies, ...input.labelledPolicies].filter(
		(p) => !deletedPolicyIds.has(p.metadata.id ?? ""),
	);
	const pools = input.labelledPools.flatMap((pool): RemovalWrite[] => {
		const id = pool.metadata.id;
		if (!id) return [];
		const label = displayLabel(pool.metadata);
		const linker = linking.find((p) => (p.spec.poolIds ?? []).includes(id));
		if (linker) {
			kept.push({
				kind: "pool",
				id,
				label,
				reason: `linked by policy ${displayLabel(linker.metadata)}`,
				inUse: true,
			});
			return [];
		}
		if (input.keptIds.has(id)) {
			kept.push({ kind: "pool", id, label, reason: "unticked", inUse: false });
			return [];
		}
		return [
			{
				kind: "pool",
				id: `pool:${id}`,
				label: `Delete pool ${label}`,
				poolId: id,
			},
		];
	});

	return {
		deletes: [
			...keys,
			...unbind,
			{
				kind: "serviceAccount",
				id: "service-account",
				label: `Delete service account ${input.serviceAccount.label}`,
				serviceAccountId: input.serviceAccount.id,
			},
			...policies,
			...pools,
		],
		kept,
	};
}
