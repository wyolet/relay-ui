import type { AgentAccount } from "@/agents/agentAccounts";
import type { Account } from "@/api/hooks/accounts";
import type { components } from "@/api/types.gen";

type AccountReceiver = components["schemas"]["AccountReceiver"];

/** The requests that bring picked provider accounts into a scope: shares, then one pool per host. */
export type AccessWrite = { id: string; label: string } & (
	| { kind: "share"; accountId: string }
	| { kind: "pool"; hostId: string; displayName: string; accountIds: string[] }
);

/**
 * Shares for the accounts the scope can't reach, then a pool per host listing
 * the picks in pick order. `owner` names the rows; `receiver` reads in the
 * share labels, e.g. "the agent's owner".
 */
export function accessWrites(
	owner: string,
	accounts: readonly AgentAccount[],
	receiver: string,
): AccessWrite[] {
	const byHost = new Map<string, AgentAccount[]>();
	for (const a of accounts) {
		byHost.set(a.hostId, [...(byHost.get(a.hostId) ?? []), a]);
	}
	return [
		...accounts
			.filter((a) => a.needsShare)
			.map(
				(a): AccessWrite => ({
					kind: "share",
					id: `share:${a.id}`,
					label: `Share ${a.label} with ${receiver}`,
					accountId: a.id,
				}),
			),
		...[...byHost].map(
			([hostId, members]): AccessWrite => ({
				kind: "pool",
				id: `pool:${hostId}`,
				label: `Create the ${members[0]?.hostLabel ?? ""} pool`,
				hostId,
				displayName: `${owner} ${members[0]?.hostLabel ?? ""} pool`,
				accountIds: members.map((m) => m.id),
			}),
		),
	];
}

/**
 * The id of the share of `sourceAccountId` that `receiver` already holds. The
 * caller's list shows its own rows with a user owner, so a user receiver
 * matches on the kind alone.
 */
export function heldShareId(
	accounts: readonly Account[],
	sourceAccountId: string,
	receiver: AccountReceiver,
): string | undefined {
	return accounts.find((a) => {
		const owner = a.metadata.owner;
		if (a.spec.sourceAccountId !== sourceAccountId || !owner) return false;
		if (receiver.kind === "user") return owner.kind === "user";
		return owner.kind === receiver.kind && owner.id === receiver.id;
	})?.metadata.id;
}
