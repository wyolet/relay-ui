import { isSharedAccount, PROVIDER_KIND } from "@/accounts/accountView";
import type { Account } from "@/api/hooks/accounts";
import type { components } from "@/api/types.gen";
import type { ByokReceiver } from "@/byok/byokWrites";
import { displayLabel } from "@/lib/displayLabel";
import { type PickedScope, scopeOwnerKey } from "@/lib/ownerPick";
import { ownerKey } from "@/lib/ownerScopes";
import type { WorkContext } from "@/lib/workContext";

type AccountReceiver = components["schemas"]["AccountReceiver"];

export interface ByokAccount {
	id: string;
	name: string;
	label: string;
	orgId?: string;
}

/** The scope's own provider accounts at the host: the ones a new key of that owner may join. */
export function ownedAccountsAt(
	accounts: readonly Account[],
	hostId: string,
	scope: PickedScope,
	userId: string | undefined,
): ByokAccount[] {
	const owner = scopeOwnerKey(scope);
	return accounts.flatMap((a) =>
		a.metadata.id &&
		a.spec.kind === PROVIDER_KIND &&
		a.spec.hostId === hostId &&
		!isSharedAccount(a) &&
		!a.spec.closed &&
		ownerKey(a.metadata.owner, userId) === owner
			? [
					{
						id: a.metadata.id,
						name: a.metadata.name,
						label: displayLabel(a.metadata),
						...(a.spec.orgId ? { orgId: a.spec.orgId } : {}),
					},
				]
			: [],
	);
}

export function receiverKey(receiver: AccountReceiver): string {
	return `${receiver.kind}:${receiver.id}`;
}

/**
 * The teams and projects an account of `scope` can be shared with: not the
 * owner itself, and not a project of the owning team, which reaches it already.
 */
export function shareReceivers(
	contexts: readonly WorkContext[],
	scope: PickedScope,
): ByokReceiver[] {
	return contexts.flatMap((c): ByokReceiver[] => {
		if (c.kind !== "team" && c.kind !== "project") return [];
		if (c.kind === scope.kind && c.id === scope.id) return [];
		if (
			scope.kind === "team" &&
			c.kind === "project" &&
			c.teamId === scope.id
		) {
			return [];
		}
		return [{ kind: c.kind, id: c.id, label: c.displayName }];
	});
}
