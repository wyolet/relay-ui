import type { Account } from "@/api/hooks/accounts";
import type { DetectedAccount } from "@/api/hooks/hostkeys";
import { ApiError } from "@/api/types/errors";
import { displayLabel } from "@/lib/displayLabel";
import { ownerKey } from "@/lib/ownerScopes";

export interface AccountOption {
	value: string;
	label: string;
}

/** Form value for "the owner's default account at the host". */
export const DEFAULT_ACCOUNT = "";

/** Accounts a key of this owner at this host may name: provider accounts at the host, same owner. */
function accountsFor(
	accounts: readonly Account[],
	hostId: string,
	owner: string,
	userId: string | undefined,
): Account[] {
	return accounts.filter(
		(a) =>
			a.spec.kind === "provider" &&
			a.spec.hostId === hostId &&
			ownerKey(a.metadata.owner, userId) === owner,
	);
}

export function defaultAccountFor(
	accounts: readonly Account[],
	hostId: string,
	owner: string,
	userId: string | undefined,
): Account | undefined {
	return accountsFor(accounts, hostId, owner, userId).find(
		(a) => a.spec.default === true,
	);
}

/** The default-account choice first, then the owner's named accounts at the host. */
export function accountOptions(
	accounts: readonly Account[],
	hostId: string,
	owner: string,
	userId: string | undefined,
): AccountOption[] {
	const named = accountsFor(accounts, hostId, owner, userId)
		.filter((a) => a.spec.default !== true)
		.map((a) => ({
			value: a.metadata.id ?? "",
			label: a.spec.orgId
				? `${displayLabel(a.metadata)} · ${a.spec.orgId}`
				: displayLabel(a.metadata),
		}));
	return [{ value: DEFAULT_ACCOUNT, label: "Default account" }, ...named];
}

/** The form value for a stored accountId: a default account reads as the default choice. */
export function accountFormValue(
	accounts: readonly Account[],
	accountId: string | undefined,
): string {
	if (!accountId) return DEFAULT_ACCOUNT;
	const account = accounts.find((a) => a.metadata.id === accountId);
	return account?.spec.default === true ? DEFAULT_ACCOUNT : accountId;
}

export type DetectionVerdict =
	| { kind: "in-place" }
	| { kind: "elsewhere"; matchingLabel: string }
	| { kind: "unmatched" };

/** Whether the key already sits in the account of the organization its host named. */
export function detectionVerdict(
	detected: DetectedAccount,
	accounts: readonly Account[],
): DetectionVerdict {
	const matching = detected.matchingAccountId;
	if (!matching) return { kind: "unmatched" };
	if (matching === detected.currentAccountId) return { kind: "in-place" };
	const account = accounts.find((a) => a.metadata.id === matching);
	return {
		kind: "elsewhere",
		matchingLabel: account ? displayLabel(account.metadata) : matching,
	};
}

export function detectionErrorMessage(err: unknown): string {
	if (err instanceof ApiError) {
		if (err.status === 422)
			return `Can't detect: ${err.body.message || "the host doesn't name organizations, or the key has no value."}`;
		if (err.status === 502)
			return `The host refused the call: ${err.body.message || "no detail."}`;
		return err.body.message || "Detection failed.";
	}
	return "Detection failed.";
}
