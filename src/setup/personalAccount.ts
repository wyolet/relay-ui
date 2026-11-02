import type { Account } from "@/api/hooks/accounts";

/** The personal account relay keeps for the user: found by kind and holder, never by name. */
export function personalAccountOf(
	accounts: readonly Account[],
	userId: string,
): Account | undefined {
	return accounts.find(
		(a) =>
			a.spec.kind === "personal" &&
			a.spec.holder?.kind === "user" &&
			a.spec.holder.id === userId,
	);
}
