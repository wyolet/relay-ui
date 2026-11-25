import { useQuery } from "@tanstack/react-query";
import {
	ACCOUNT_KIND_LABELS,
	accountLabel,
	sharedByName,
} from "@/accounts/accountView";
import { type Account, accountListQueryOptions } from "@/api/hooks/accounts";
import { displayLabel } from "@/lib/displayLabel";

/**
 * "Kind · name" per account id, plus the account's slug for a link. Loads
 * non-suspending; an id no visible account holds shows shortened.
 */
export function useAccountLabels() {
	const { data } = useQuery({ ...accountListQueryOptions, retry: false });
	const byId = new Map<string, Account>();
	for (const a of data?.items ?? []) {
		if (a.metadata.id) byId.set(a.metadata.id, a);
	}

	function labelOf(id: string): {
		label: string;
		name: string | undefined;
		/** The label's parts, for a chip that sets the kind apart from the name. */
		kind?: string;
		title: string;
		sharedBy?: string;
	} {
		const account = byId.get(id);
		if (!account) {
			const short = `${id.slice(0, 8)}…`;
			return { label: short, name: undefined, title: short };
		}
		return {
			label: accountLabel(account),
			name: account.metadata.name,
			kind: ACCOUNT_KIND_LABELS[account.spec.kind],
			title: displayLabel(account.metadata),
			sharedBy: sharedByName(account),
		};
	}

	return { labelOf };
}
