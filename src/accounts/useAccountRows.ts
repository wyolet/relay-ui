import { useState } from "react";
import { type Account, useAccounts } from "@/api/hooks/accounts";
import { useHostKeys } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import type { Host } from "@/api/types/host";
import { displayLabel } from "@/lib/displayLabel";

export interface AccountRow {
	account: Account;
	host: Host | undefined;
	hostLabel: string;
	keyCount: number;
}

/** Account rows with their host and key count, filtered by the search box. */
export function useAccountRows() {
	const { data: accountsData } = useAccounts();
	const { data: hostsData } = useHosts();
	const { data: hostKeysData } = useHostKeys();
	const [q, setQ] = useState("");

	const hostById = new Map<string, Host>();
	for (const h of hostsData.items ?? []) {
		if (h.metadata.id) hostById.set(h.metadata.id, h);
	}
	const keyCounts = new Map<string, number>();
	for (const hk of hostKeysData.items ?? []) {
		const id = hk.spec.accountId;
		if (id) keyCounts.set(id, (keyCounts.get(id) ?? 0) + 1);
	}

	const allRows: AccountRow[] = (accountsData.items ?? []).map((account) => {
		const host = hostById.get(account.spec.hostId);
		return {
			account,
			host,
			hostLabel: host
				? displayLabel(host.metadata)
				: `Unknown (${account.spec.hostId.slice(0, 6)}…)`,
			keyCount: keyCounts.get(account.metadata.id ?? "") ?? 0,
		};
	});
	const needle = q.trim().toLowerCase();
	const rows = needle
		? allRows.filter(
				(r) =>
					displayLabel(r.account.metadata).toLowerCase().includes(needle) ||
					r.account.metadata.name.includes(needle) ||
					r.hostLabel.toLowerCase().includes(needle) ||
					(r.account.spec.orgId ?? "").toLowerCase().includes(needle),
			)
		: allRows;

	return { rows, total: allRows.length, q, setQ };
}
