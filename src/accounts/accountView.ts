import type { Account, AccountSpec } from "@/api/hooks/accounts";
import type { Host } from "@/api/types/host";
import type { components } from "@/api/types.gen";
import { displayLabel } from "@/lib/displayLabel";

export type AccountKind = AccountSpec["kind"];
type AccountHolder = components["schemas"]["AccountHolder"];
type AccountShareParty = components["schemas"]["AccountShareParty"];

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
	team: "Team",
	project: "Project",
	personal: "Personal",
	member: "Member",
	service: "Service",
	provider: "Provider",
};

/** "Kind · name", the label every account picker and chip shows; a shared account adds who shared it. */
export function accountLabel(account: Account): string {
	const label = `${ACCOUNT_KIND_LABELS[account.spec.kind]} · ${displayLabel(account.metadata)}`;
	const sharer = sharedByName(account);
	return sharer === undefined ? label : `${label} · shared by ${sharer}`;
}

/** A copy of a provider account made by sharing it; it holds no keys of its own. */
export function isSharedAccount(account: Account): boolean {
	return Boolean(account.spec.sourceAccountId);
}

/** Who shared it; a party the caller can't see shows a short id. */
export function partyName(party: AccountShareParty): string {
	if (party.kind === "system") return "System";
	if (party.name) return party.name;
	return party.id ? shortId(party.id) : "unknown";
}

/** Who shared the account, or undefined for one that isn't shared. */
export function sharedByName(account: Account): string | undefined {
	if (!isSharedAccount(account)) return undefined;
	const party = account.spec.sharedBy;
	return party ? partyName(party) : "unknown";
}

export const ACCOUNT_KINDS = [
	"team",
	"project",
	"personal",
	"member",
	"service",
	"provider",
] as const satisfies readonly AccountKind[];

/** The only kind POST /accounts creates. */
export const PROVIDER_KIND: Extract<AccountKind, "provider"> = "provider";

/** Provider accounts ahead of caller accounts, each group in its given order. */
export function providersFirst(accounts: readonly Account[]): Account[] {
	return [
		...accounts.filter((a) => a.spec.kind === PROVIDER_KIND),
		...accounts.filter((a) => a.spec.kind !== PROVIDER_KIND),
	];
}

export function parseAccountKind(value: string): AccountKind | undefined {
	return ACCOUNT_KINDS.find((k) => k === value);
}

/** Relay manages caller accounts; only provider and closed member accounts may be deleted. */
export function canDeleteAccount(spec: AccountSpec): boolean {
	return (
		spec.kind === PROVIDER_KIND ||
		(spec.kind === "member" && spec.closed === true)
	);
}

export function shortId(id: string): string {
	return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function hostLabel(host: Host | undefined, hostId: string): string {
	return host ? displayLabel(host.metadata) : `Unknown (${shortId(hostId)})`;
}

export interface HolderView {
	kind: AccountHolder["kind"];
	id: string;
	label: string;
	/** The service account's slug, for its detail link; unset until it resolves. */
	serviceAccountName?: string;
}

interface HolderSources {
	users: readonly { id: string; username: string }[];
	serviceAccounts: readonly {
		metadata: { id?: string; name: string; displayName?: string };
	}[];
}

/** The holder's username or service-account name, else a short id. */
export function resolveHolder(
	holder: AccountHolder,
	{ users, serviceAccounts }: HolderSources,
): HolderView {
	if (holder.kind === "user") {
		const user = users.find((u) => u.id === holder.id);
		return {
			...holder,
			label: holder.name ?? user?.username ?? shortId(holder.id),
		};
	}
	const sa = serviceAccounts.find((s) => s.metadata.id === holder.id);
	return sa
		? {
				...holder,
				label: holder.name ?? displayLabel(sa.metadata),
				serviceAccountName: sa.metadata.name,
			}
		: { ...holder, label: holder.name ?? shortId(holder.id) };
}

/** What the UI knows about the caller: its admin role, id and membership scopes ("team:<id>", "project:<id>"). */
export interface Caller {
	isAdmin: boolean;
	userId: string | undefined;
	scopes: readonly string[];
}

/**
 * Relay lets an admin, or an admin of the account's team or project, set its
 * payload logging, never its holder. The UI sees memberships, not scope roles,
 * so a member is offered the control and the server has the last word.
 */
export function canSetPayloadLogging(
	account: Account,
	caller: Caller,
): boolean {
	if (caller.isAdmin) return true;
	const holder = account.spec.holder;
	if (holder?.kind === "user" && holder.id === caller.userId) return false;
	const owner = account.metadata.owner;
	if (owner?.kind !== "team" && owner?.kind !== "project") return false;
	return caller.scopes.includes(`${owner.kind}:${owner.id ?? ""}`);
}
