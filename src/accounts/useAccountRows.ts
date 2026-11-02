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
} from "@/accounts/accountView";
import { useHolderResolver } from "@/accounts/useHolderResolver";
import { type Account, useAccounts } from "@/api/hooks/accounts";
import { useHostKeys } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import type { Host } from "@/api/types/host";
import type { FilterDef, FilterState } from "@/filters/types";
import { displayLabel } from "@/lib/displayLabel";

export const ACCOUNT_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search accounts",
		default: "",
	},
	{
		key: "kind",
		type: "select",
		label: "Kind",
		default: "all",
		options: [
			{ value: "all", label: "Any kind" },
			...ACCOUNT_KINDS.map((k) => ({
				value: k,
				label: ACCOUNT_KIND_LABELS[k],
			})),
		],
	},
] satisfies readonly FilterDef[];

/** Host fields are set on provider accounts only. */
export interface AccountRow {
	account: Account;
	holder: HolderView | undefined;
	provider:
		| { host: Host | undefined; hostLabel: string; keyCount: number }
		| undefined;
	deletable: boolean;
}

/** Account rows with their holder and, for provider accounts, host and key count. */
export function useAccountRows() {
	const { data: accountsData } = useAccounts();
	const { data: hostsData } = useHosts();
	const { data: hostKeysData } = useHostKeys();
	const toHolder = useHolderResolver();
	const [q, setQ] = useState("");
	const [kind, setKind] = useState<AccountKind | "all">("all");

	const hostById = new Map<string, Host>();
	for (const h of hostsData.items ?? []) {
		if (h.metadata.id) hostById.set(h.metadata.id, h);
	}
	const keyCounts = new Map<string, number>();
	for (const hk of hostKeysData.items ?? []) {
		const id = hk.spec.accountId;
		if (id) keyCounts.set(id, (keyCounts.get(id) ?? 0) + 1);
	}

	const allRows: AccountRow[] = providersFirst(accountsData.items ?? []).map(
		(account) => {
			const { spec } = account;
			const hostId = spec.hostId ?? "";
			const host = hostById.get(hostId);
			return {
				account,
				holder: spec.holder ? toHolder(spec.holder) : undefined,
				provider:
					spec.kind === PROVIDER_KIND
						? {
								host,
								hostLabel: hostLabel(host, hostId),
								keyCount: keyCounts.get(account.metadata.id ?? "") ?? 0,
							}
						: undefined,
				deletable: canDeleteAccount(spec),
			};
		},
	);

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
			(!needle || matches(r)),
	);

	function setFilters(patch: FilterState) {
		if (typeof patch.q === "string") setQ(patch.q);
		if (typeof patch.kind === "string")
			setKind(parseAccountKind(patch.kind) ?? "all");
	}

	return {
		rows,
		total: allRows.length,
		filters: { q, kind },
		setFilters,
	};
}
