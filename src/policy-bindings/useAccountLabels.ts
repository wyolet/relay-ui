import { useQuery } from "@tanstack/react-query";
import { accountLabel } from "@/accounts/accountView";
import { type Account, accountListQueryOptions } from "@/api/hooks/accounts";

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

	function labelOf(id: string): { label: string; name: string | undefined } {
		const account = byId.get(id);
		return account
			? { label: accountLabel(account), name: account.metadata.name }
			: { label: `${id.slice(0, 8)}…`, name: undefined };
	}

	return { labelOf };
}
