import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import {
	ACCOUNT_KIND_LABELS,
	ACCOUNT_KINDS,
	type AccountKind,
	canDeleteAccount,
	type HolderView,
	hostLabel,
	PROVIDER_KIND,
	parseAccountKind,
	providersFirst,
	sharedByName,
} from "@/accounts/accountView";
import { filterMyAccountRows, toMyAccountRow } from "@/accounts/myAccountRows";
import { useHolderResolver } from "@/accounts/useHolderResolver";
import {
	type Account,
	accountListQueryOptions,
	useAccounts,
	useMyAccounts,
} from "@/api/hooks/accounts";
import { useHostKeys } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import type { Host } from "@/api/types/host";
import type { FilterDef, FilterState } from "@/filters/types";
import { useOwnerFilter } from "@/hooks/useOwnerFilter";
import { displayLabel } from "@/lib/displayLabel";
import type { ModelUsage } from "@/lib/pricingMatrix";
import { useWeekUsageBy } from "@/pricing/useHostModelUsage";

export type AccountSide = "provider" | "relay";

const SEARCH_ACCOUNTS = {
	key: "q",
	type: "search",
	label: "Search",
	placeholder: "Search accounts",
	default: "",
} as const satisfies FilterDef;

/** The toolbar per side: relay accounts filter by kind and "Mine". */
export const ACCOUNT_FILTERS = {
	provider: [SEARCH_ACCOUNTS],
	relay: [
		SEARCH_ACCOUNTS,
		{
			key: "kind",
			type: "select",
			label: "Kind",
			default: "all",
			options: [
				{ value: "all", label: "Any kind" },
				...ACCOUNT_KINDS.filter((k) => k !== PROVIDER_KIND).map((k) => ({
					value: k,
					label: ACCOUNT_KIND_LABELS[k],
				})),
			],
		},
		{ key: "mine", type: "toggle", label: "Mine", default: false },
	],
} as const satisfies Record<AccountSide, readonly FilterDef[]>;

/** Host fields are set on provider accounts only. */
export interface AccountRow {
	account: Account;
	holder: HolderView | undefined;
	provider:
		| { host: Host | undefined; hostLabel: string; keyCount: number }
		| undefined;
	/** Who shared it; unset on accounts that aren't shared. */
	sharedBy: string | undefined;
	deletable: boolean;
	/** Last week's traffic: drawn from a provider account, run in a relay one. */
	usage: ModelUsage | undefined;
}

export interface AccountFilters {
	side: AccountSide;
	q: string;
	kind: AccountKind | "all";
	/** List the caller's own accounts (`/me/accounts`) instead of every account. */
	mine: boolean;
}

/** The Accounts tab's filters; `mine` lives in the URL so links can open it. */
export function useAccountFilters() {
	const navigate = useNavigate({ from: "/keys" });
	const { mine, accounts: side } = useSearch({ from: "/_authenticated/keys" });
	const [q, setQ] = useState("");
	const [kind, setKind] = useState<AccountKind | "all">("all");

	function setFilters(patch: FilterState) {
		if (typeof patch.q === "string") setQ(patch.q);
		if (typeof patch.kind === "string")
			setKind(parseAccountKind(patch.kind) ?? "all");
		const nextMine = patch.mine;
		if (typeof nextMine === "boolean")
			void navigate({
				search: (prev) => ({ ...prev, mine: nextMine }),
				replace: true,
			});
	}

	// "Mine" and the kind are relay-side filters; switching sides drops them.
	function setSide(next: AccountSide) {
		setKind("all");
		void navigate({
			search: (prev) => ({ ...prev, accounts: next, mine: false }),
			replace: true,
		});
	}

	const filters: AccountFilters = { side, q, kind, mine };
	return { filters, setFilters, setSide };
}

/** The All accounts list's owner filter; it renders in the toolbar, outside the list's Suspense. */
export function useAccountOwnerFilter() {
	const { data } = useQuery({ ...accountListQueryOptions, retry: false });
	return useOwnerFilter(data?.items ?? []);
}

/** One side's account rows with their holder, last week's traffic and, for
 * provider accounts, host and key count. */
export function useAccountRows({
	side,
	q,
	kind,
	ownerMatches,
}: Pick<AccountFilters, "side" | "q" | "kind"> & {
	ownerMatches: (account: Account) => boolean;
}) {
	const { data: accountsData } = useAccounts();
	const { data: hostsData } = useHosts();
	const { data: hostKeysData } = useHostKeys();
	const toHolder = useHolderResolver();
	const drawn = useWeekUsageBy("account_id", side === "provider");
	const drawnViaShare = useWeekUsageBy("via_account_id", side === "provider");
	const charged = useWeekUsageBy("lane_account_id", side === "relay");

	const hostById = new Map<string, Host>();
	for (const h of hostsData.items ?? []) {
		if (h.metadata.id) hostById.set(h.metadata.id, h);
	}
	const keyCounts = new Map<string, number>();
	for (const hk of hostKeysData.items ?? []) {
		const id = hk.spec.accountId;
		if (id) keyCounts.set(id, (keyCounts.get(id) ?? 0) + 1);
	}

	const sideAccounts = (accountsData.items ?? []).filter(
		(a) => (a.spec.kind === PROVIDER_KIND) === (side === "provider"),
	);
	const allRows: AccountRow[] = providersFirst(sideAccounts).map((account) => {
		const { spec } = account;
		const id = account.metadata.id ?? "";
		const hostId = spec.hostId ?? "";
		const host = hostById.get(hostId);
		// A shared account holds no keys; it counts its real account's.
		const keyOwnerId = spec.sourceAccountId ?? id;
		// A share's traffic is counted on the real account; its own part is via_account_id.
		const usage =
			side === "relay"
				? charged?.get(id)
				: (spec.sourceAccountId ? drawnViaShare : drawn)?.get(id);
		return {
			account,
			holder: spec.holder ? toHolder(spec.holder) : undefined,
			provider:
				spec.kind === PROVIDER_KIND
					? {
							host,
							hostLabel: hostLabel(host, hostId),
							keyCount: keyCounts.get(keyOwnerId) ?? 0,
						}
					: undefined,
			sharedBy: sharedByName(account),
			deletable: canDeleteAccount(spec),
			usage,
		};
	});

	const needle = q.trim().toLowerCase();
	const matches = (r: AccountRow) =>
		[
			displayLabel(r.account.metadata),
			r.account.metadata.name,
			r.holder?.label ?? "",
			r.provider?.hostLabel ?? "",
			r.account.spec.orgId ?? "",
		].some((s) => s.toLowerCase().includes(needle));
	const rows = allRows.filter(
		(r) =>
			(kind === "all" || r.account.spec.kind === kind) &&
			ownerMatches(r.account) &&
			(!needle || matches(r)),
	);

	return { rows, total: allRows.length };
}

/** The caller's own relay accounts, narrowed by the tab's search and kind. */
export function useMyAccountRows({
	q,
	kind,
}: Pick<AccountFilters, "q" | "kind">) {
	const { data } = useMyAccounts();
	const allRows = data
		.map(toMyAccountRow)
		.filter((r) => r.kind !== PROVIDER_KIND);
	return { rows: filterMyAccountRows(allRows, q, kind), total: allRows.length };
}
