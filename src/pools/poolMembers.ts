import { PROVIDER_KIND, sharedByName, shortId } from "@/accounts/accountView";
import type { Account } from "@/api/hooks/accounts";
import { displayLabel } from "@/lib/displayLabel";

/** An account or key a pool lists, as its pickers and detail show it. */
export interface PoolMemberOption {
	id: string;
	label: string;
	/** The slug, for a link; the id when the row isn't visible. */
	name: string;
	enabled: boolean;
	/** Who shared the account; unset for keys and accounts that aren't shared. */
	sharedBy?: string;
	/** False when the caller can't see the row. */
	known: boolean;
}

export function accountMember(account: Account): PoolMemberOption {
	const sharedBy = sharedByName(account);
	return {
		id: account.metadata.id ?? "",
		label: displayLabel(account.metadata),
		name: account.metadata.name,
		enabled: account.spec.closed !== true,
		...(sharedBy === undefined ? {} : { sharedBy }),
		known: true,
	};
}

export function unknownMember(id: string): PoolMemberOption {
	return {
		id,
		label: `Unknown (${shortId(id)})`,
		name: id,
		enabled: true,
		known: false,
	};
}

/** The pool's accounts in order, named from any account the caller can see. */
export function chosenAccounts(
	ids: readonly string[],
	visible: readonly Account[],
): PoolMemberOption[] {
	const byId = new Map<string, Account>();
	for (const a of visible) if (a.metadata.id) byId.set(a.metadata.id, a);
	return ids.map((id) => {
		const account = byId.get(id);
		return account ? accountMember(account) : unknownMember(id);
	});
}

/** Provider accounts at the pool's host, own and shared, not yet in the pool. */
export function availableAccounts(
	usable: readonly Account[],
	hostId: string,
	chosen: readonly string[],
): PoolMemberOption[] {
	return usable.flatMap((a) =>
		a.metadata.id &&
		a.spec.kind === PROVIDER_KIND &&
		a.spec.hostId === hostId &&
		!chosen.includes(a.metadata.id)
			? [accountMember(a)]
			: [],
	);
}
