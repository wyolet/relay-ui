import { isSharedAccount, sharedByName } from "@/accounts/accountView";
import type { Account } from "@/api/hooks/accounts";
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

/**
 * The accounts the agent's scope may pool (`usable`), then the caller's own
 * provider accounts it can't reach yet and no share in the scope stands for.
 */
export function agentAccounts(
	usable: readonly Account[],
	visible: readonly Account[],
	userId: string | undefined,
	hostLabel: (hostId: string) => string,
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
		if (!id || !hostId) return [];
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
