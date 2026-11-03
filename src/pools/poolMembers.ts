import { PROVIDER_KIND, sharedByName, shortId } from "@/accounts/accountView";
import type { Account } from "@/api/hooks/accounts";
import type { HostKey } from "@/api/types/hostkey";
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
	/** The second line: what the member brings to the pool. */
	meta?: string;
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

/** How many of the visible keys each account holds. */
export function keyCountByAccount(
	keys: readonly HostKey[],
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const k of keys) {
		const id = k.spec.accountId;
		if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
	}
	return counts;
}

/** An account member's second line; keys the caller can't see leave it uncounted. */
export function accountMeta(keyCount: number | undefined): string {
	if (!keyCount) return "Account · all its keys, now and later";
	return `Account · ${keyCount === 1 ? "1 key" : `${keyCount} keys`}, and any added later`;
}
