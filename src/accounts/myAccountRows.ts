import type { AccountKind } from "@/accounts/accountView";
import type { MyAccount } from "@/api/hooks/accounts";
import type { components } from "@/api/types.gen";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";

type AccountKey = components["schemas"]["AccountKey"];

/** A `/me/accounts` row as the Accounts tab lists it under "Mine". */
export interface MyAccountRow {
	id: string;
	name: string;
	label: string;
	showName: boolean;
	closed: boolean;
	kind: MyAccount["kind"];
	scope: MyAccount["scope"];
	policy: MyAccount["policy"];
	/** The user's keys that run in the account by default. */
	keys: AccountKey[];
	tokenOnly: boolean;
}

export function toMyAccountRow(row: MyAccount): MyAccountRow {
	const { account } = row;
	return {
		id: account.id,
		name: account.name,
		label: displayLabel(account),
		showName: hasDisplayName(account),
		closed: account.closed,
		kind: row.kind,
		scope: row.scope,
		policy: row.policy,
		keys: row.keys ?? [],
		tokenOnly: row.tokenOnly,
	};
}

/** Rows of `kind` whose name, scope, policy or key names contain `q`. */
export function filterMyAccountRows(
	rows: readonly MyAccountRow[],
	q: string,
	kind: AccountKind | "all",
): MyAccountRow[] {
	const needle = q.trim().toLowerCase();
	const matches = (r: MyAccountRow) =>
		[
			r.label,
			r.name,
			r.scope.name,
			r.policy?.name ?? "",
			...r.keys.map((k) => k.name),
		].some((s) => s.toLowerCase().includes(needle));
	return rows.filter(
		(r) => (kind === "all" || r.kind === kind) && (!needle || matches(r)),
	);
}
