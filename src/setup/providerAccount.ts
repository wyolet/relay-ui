import { isSharedAccount, PROVIDER_KIND } from "@/accounts/accountView";
import type { Account } from "@/api/hooks/accounts";
import { ownerKey, PERSONAL_OWNER } from "@/lib/ownerScopes";

/** The caller's own provider account at a host, which the wizard's key joins; shares hold no keys. */
export function ownProviderAccountAt(
	accounts: readonly Account[],
	hostId: string,
	userId: string,
): Account | undefined {
	return accounts.find(
		(a) =>
			a.spec.kind === PROVIDER_KIND &&
			a.spec.hostId === hostId &&
			!isSharedAccount(a) &&
			ownerKey(a.metadata.owner, userId) === PERSONAL_OWNER,
	);
}
