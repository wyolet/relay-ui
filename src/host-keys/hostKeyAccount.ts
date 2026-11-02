import {
	hostLabel,
	isSharedAccount,
	PROVIDER_KIND,
} from "@/accounts/accountView";
import type { Account } from "@/api/hooks/accounts";
import type { DetectedAccount } from "@/api/hooks/hostkeys";
import { ApiError } from "@/api/types/errors";
import type { Host } from "@/api/types/host";
import { displayLabel } from "@/lib/displayLabel";
import { ownerKey } from "@/lib/ownerScopes";

export interface AccountOption {
	value: string;
	label: string;
}

/** Form value for "the owner's default account at the host". */
export const DEFAULT_ACCOUNT = "";

/** Create-form value for "make a provider account with the key". */
export const NEW_ACCOUNT = "+new";

export interface KeyAccountOption {
	value: string;
	label: string;
	hostId: string;
	orgId?: string;
	isDefault: boolean;
}

export interface KeyAccountGroup {
	hostId: string;
	hostLabel: string;
	host?: Host;
	accounts: KeyAccountOption[];
}

/**
 * The provider accounts a new key of `owner` may join, grouped by host and
 * sorted by host then account. Shared accounts hold no keys of their own.
 */
export function keyAccountGroups(
	usable: readonly Account[],
	hosts: readonly Host[],
	owner: string,
	userId: string | undefined,
): KeyAccountGroup[] {
	const groups = new Map<string, KeyAccountGroup>();
	for (const a of usable) {
		const id = a.metadata.id;
		const hostId = a.spec.hostId;
		if (
			!id ||
			!hostId ||
			a.spec.kind !== PROVIDER_KIND ||
			isSharedAccount(a) ||
			ownerKey(a.metadata.owner, userId) !== owner
		)
			continue;
		let group = groups.get(hostId);
		if (!group) {
			const host = hosts.find((h) => h.metadata.id === hostId);
			group = {
				hostId,
				hostLabel: hostLabel(host, hostId),
				...(host ? { host } : {}),
				accounts: [],
			};
			groups.set(hostId, group);
		}
		group.accounts.push({
			value: id,
			label: displayLabel(a.metadata),
			hostId,
			...(a.spec.orgId ? { orgId: a.spec.orgId } : {}),
			isDefault: a.spec.default === true,
		});
	}
	const sorted = [...groups.values()].sort((x, y) =>
		x.hostLabel.localeCompare(y.hostLabel),
	);
	for (const g of sorted)
		g.accounts.sort((x, y) => x.label.localeCompare(y.label));
	return sorted;
}

/** The name a new account starts with: its host's. */
export function defaultNewAccountName(host: Host | undefined): string {
	return host ? displayLabel(host.metadata) : "";
}

/** A host change renames the new account unless the user typed their own name. */
export function nextNewAccountName(
	current: string,
	previousDefault: string,
	nextDefault: string,
): string {
	return current.trim() === "" || current === previousDefault
		? nextDefault
		: current;
}

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

/**
 * The default-account choice first, then the named provider accounts at the
 * host the key's owner may use; `current` stays listed so an edit keeps it.
 */
export function accountOptions(
	usable: readonly Account[],
	hostId: string,
	current?: Account,
): AccountOption[] {
	const listed =
		current && !usable.some((a) => a.metadata.id === current.metadata.id)
			? [...usable, current]
			: usable;
	const named = listed
		.filter(
			(a) =>
				a.spec.kind === "provider" &&
				a.spec.hostId === hostId &&
				a.spec.default !== true &&
				!isSharedAccount(a),
		)
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
