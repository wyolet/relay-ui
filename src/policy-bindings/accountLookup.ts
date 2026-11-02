import type { Account } from "@/api/hooks/accounts";
import { ApiError } from "@/api/types/errors";
import type { PolicyBinding } from "@/api/types/policyBinding";
import type { Project } from "@/api/types/project";
import type { components } from "@/api/types.gen";

type Owner = components["schemas"]["Owner"];
export type AccountHolder = components["schemas"]["AccountHolder"];

/**
 * Whether an account sits inside a binding owner's scope: the system holds
 * every account, any other scope its own, and a team also its projects'.
 */
export function inOwnerScope(
	account: Account,
	scope: Owner,
	projects: readonly Project[],
): boolean {
	if (scope.kind === "system") return true;
	const owner = account.metadata.owner;
	if (!owner?.id || !scope.id) return false;
	if (owner.kind === scope.kind && owner.id === scope.id) return true;
	return (
		scope.kind === "team" &&
		owner.kind === "project" &&
		projects.some(
			(p) => p.metadata.id === owner.id && p.spec.teamId === scope.id,
		)
	);
}

/** The binding that holds an account; an account sits in at most one. */
export function accountBinding(
	bindings: readonly PolicyBinding[],
	accountId: string,
): PolicyBinding | undefined {
	return bindings.find((b) => (b.spec.accountIds ?? []).includes(accountId));
}

/** The open accounts a user or service account acts in. */
export function heldAccounts(
	accounts: readonly Account[],
	holder: AccountHolder,
): Account[] {
	return accounts.filter(
		(a) =>
			a.spec.holder?.kind === holder.kind &&
			a.spec.holder.id === holder.id &&
			!a.spec.closed,
	);
}

/** Accounts a key of this principal may run in: those it holds, and for a user the provider accounts that user owns. */
export function laneAccounts(
	accounts: readonly Account[],
	holder: AccountHolder,
): Account[] {
	const owned =
		holder.kind === "user"
			? accounts.filter(
					(a) =>
						a.spec.kind === "provider" &&
						a.metadata.owner?.kind === "user" &&
						a.metadata.owner.id === holder.id &&
						!a.spec.closed,
				)
			: [];
	return [...heldAccounts(accounts, holder), ...owned];
}

/** The lane a key runs in when it names none: the service account's account, or the user's personal one. */
export function defaultLane(
	accounts: readonly Account[],
	holder: AccountHolder,
): Account | undefined {
	const kind = holder.kind === "serviceaccount" ? "service" : "personal";
	return heldAccounts(accounts, holder).find((a) => a.spec.kind === kind);
}

/** A team, project or service account, the rows that have an account of their own. */
export interface AccountOwnerRef {
	kind: "team" | "project" | "serviceaccount";
	id: string;
}

/** A team's or project's own account by kind and owner; a service account's by holder. */
export function ownAccount(
	accounts: readonly Account[],
	of: AccountOwnerRef,
): Account | undefined {
	if (of.kind === "serviceaccount") {
		return accounts.find(
			(a) =>
				a.spec.kind === "service" &&
				a.spec.holder?.kind === "serviceaccount" &&
				a.spec.holder.id === of.id,
		);
	}
	return accounts.find(
		(a) =>
			a.spec.kind === of.kind &&
			a.metadata.owner?.kind === of.kind &&
			a.metadata.owner.id === of.id,
	);
}

export function isDuplicateBinding(err: unknown): err is ApiError {
	return (
		err instanceof ApiError &&
		err.status === 409 &&
		err.body.code === "duplicate_binding"
	);
}

export interface DuplicateAccount {
	/** Id of the refused account, when the message names it. */
	accountId: string | undefined;
	message: string;
}

/**
 * A duplicate_binding message with its leading "account <id>" swapped for a
 * readable name; `name` resolves the id, undefined keeps it raw.
 */
export function describeDuplicate(
	message: string,
	name: (accountId: string) => string | undefined,
): DuplicateAccount {
	const match = /^account (\S+) is already bound/.exec(message);
	const accountId = match?.[1];
	if (!accountId) return { accountId: undefined, message };
	const readable = name(accountId);
	return {
		accountId,
		message: readable
			? message.replace(`account ${accountId}`, readable)
			: message,
	};
}
