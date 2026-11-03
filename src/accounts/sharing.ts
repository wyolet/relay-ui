import { isSharedAccount, PROVIDER_KIND } from "@/accounts/accountView";
import type {
	Account,
	AccountReceiver,
	AccountShare,
	AccountShareParty,
} from "@/api/hooks/accounts";
import { ApiError } from "@/api/types/errors";
import {
	isPersonalAccountOff,
	SHARE_RECEIVER_OFF_MESSAGE,
} from "@/lib/personalAccount";
import { costTotal } from "@/lib/usage-math/cost";
import { fmtInt, fmtMoney } from "@/usage/format";

export type ReceiverKind = AccountReceiver["kind"];

export const RECEIVER_KINDS = [
	"user",
	"team",
	"project",
	"serviceaccount",
] as const satisfies readonly ReceiverKind[];

const PARTY_KIND_LABELS: Record<AccountShareParty["kind"], string> = {
	system: "System",
	user: "User",
	team: "Team",
	project: "Project",
	serviceaccount: "Service account",
};

export function partyKindLabel(kind: AccountShareParty["kind"]): string {
	return PARTY_KIND_LABELS[kind];
}

export function parseReceiverKind(value: string): ReceiverKind | undefined {
	return RECEIVER_KINDS.find((k) => k === value);
}

/** The caller as sharing sees it: its admin role, id, and the scopes it administers ("team:<id>", "project:<id>"). */
export interface ShareCaller {
	isAdmin: boolean;
	userId: string | undefined;
	adminScopes: readonly string[];
}

/**
 * Only the real provider account's owner shares it: the user of a personal
 * one, an admin of the owning team, project or the system otherwise. The
 * server has the last word.
 */
export function canShareAccount(
	account: Account,
	caller: ShareCaller,
): boolean {
	if (account.spec.kind !== PROVIDER_KIND || isSharedAccount(account))
		return false;
	const owner = account.metadata.owner;
	switch (owner?.kind) {
		case "user":
			return Boolean(owner.id) && owner.id === caller.userId;
		case "system":
			return caller.isAdmin;
		case "team":
		case "project":
			return (
				caller.isAdmin ||
				caller.adminScopes.includes(`${owner.kind}:${owner.id ?? ""}`)
			);
		default:
			return false;
	}
}

/** "1,204 req · $3.10" over the share's window; "—" when this deployment reads no usage. */
export function shareUsageText(usage: AccountShare["usage"]): string {
	if (!usage) return "—";
	const cost = costTotal(usage.costNanos, usage.unpriced, usage.requests);
	const money = cost.usd === null ? "—" : fmtMoney(cost.usd, "USD");
	return `${fmtInt(usage.requests)} req · ${money}`;
}

/** A share the server refused for a reason the receiver field explains. */
export function shareReceiverError(err: unknown): string | undefined {
	if (isPersonalAccountOff(err)) return SHARE_RECEIVER_OFF_MESSAGE;
	if (!(err instanceof ApiError) || err.status !== 409) return undefined;
	const code = err.body.code;
	return code === "share_exists" || code === "reshare_refused"
		? err.body.message
		: undefined;
}
