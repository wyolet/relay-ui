import { isSharedAccount, sharedByName } from "@/accounts/accountView";
import type { Account } from "@/api/hooks/accounts";
import type { Pool } from "@/api/hooks/pools";
import type { Host } from "@/api/types/host";
import { displayLabel } from "@/lib/displayLabel";
import {
	type PickerReach,
	type PickerReachModel,
	pickerReachKey,
} from "@/models/narrowPickerIndex";
import type { ModelRow } from "@/models/usePickerCatalog";

/** A provider account the agent may be given. */
export interface AgentAccount {
	id: string;
	label: string;
	hostId: string;
	hostLabel: string;
	/** The caller's own account, outside the agent's scope until it is shared with it. */
	needsShare: boolean;
	sharedBy?: string;
}

function ownedPersonallyBy(account: Account, userId: string): boolean {
	return (
		account.metadata.owner?.kind === "user" &&
		account.metadata.owner.id === userId &&
		!isSharedAccount(account) &&
		!account.spec.closed
	);
}

/** An existing pool at a host that takes no key; the agent reaches such a host only through a pool. */
export interface AgentPool {
	id: string;
	label: string;
	hostId: string;
	hostLabel: string;
}

export function keylessHostIds(hosts: readonly Host[]): Set<string> {
	return new Set(
		hosts.flatMap((h) => (h.spec.noAuth && h.metadata.id ? h.metadata.id : [])),
	);
}

/**
 * The accounts the agent's scope may pool (`usable`), then the caller's own
 * provider accounts it can't reach yet and no share in the scope stands for.
 * Accounts at keyless hosts are left out: relay pools those hosts by pool only.
 */
export function agentAccounts(
	usable: readonly Account[],
	visible: readonly Account[],
	userId: string | undefined,
	hostLabel: (hostId: string) => string,
	keylessHosts: ReadonlySet<string>,
): AgentAccount[] {
	const reached = new Set<string>();
	for (const a of usable) {
		if (a.metadata.id) reached.add(a.metadata.id);
		if (a.spec.sourceAccountId) reached.add(a.spec.sourceAccountId);
	}
	const own = userId
		? visible.filter(
				(a) =>
					a.spec.kind === "provider" &&
					ownedPersonallyBy(a, userId) &&
					!reached.has(a.metadata.id ?? ""),
			)
		: [];
	const row = (a: Account, needsShare: boolean): AgentAccount[] => {
		const id = a.metadata.id;
		const hostId = a.spec.hostId;
		if (!id || !hostId || keylessHosts.has(hostId)) return [];
		return [
			{
				id,
				label: displayLabel(a.metadata),
				hostId,
				hostLabel: hostLabel(hostId),
				needsShare,
				sharedBy: sharedByName(a),
			},
		];
	};
	return [
		...usable.flatMap((a) => row(a, false)),
		...own.flatMap((a) => row(a, true)),
	];
}

/** The pools the scope may link (`usable`) at keyless hosts. */
export function keylessPools(
	usable: readonly Pool[],
	keylessHosts: ReadonlySet<string>,
	hostLabel: (hostId: string) => string,
): AgentPool[] {
	return usable.flatMap((p) => {
		const id = p.metadata.id;
		const hostId = p.spec.hostId;
		if (!id || !keylessHosts.has(hostId)) return [];
		return [
			{
				id,
				label: displayLabel(p.metadata),
				hostId,
				hostLabel: hostLabel(hostId),
			},
		];
	});
}

/** The models the hosts serve, as the model picker's reach. */
export function hostReach(
	modelRows: readonly ModelRow[],
	hostNames: readonly string[],
): PickerReach {
	const wanted = new Set(hostNames);
	const models = new Map<string, PickerReachModel>();
	for (const m of modelRows) {
		const serving = m.hostNames.filter((h) => wanted.has(h));
		if (serving.length > 0) {
			models.set(pickerReachKey(m.provider, m.name), { hostNames: serving });
		}
	}
	return { models };
}
