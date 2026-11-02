import { useQuery } from "@tanstack/react-query";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { displayLabel } from "@/lib/displayLabel";

export interface LaneAccount {
	/** Route param for /accounts/$name. */
	name: string;
	label: string;
}

/** The account a request ran in, from the cached accounts list; undefined
 * while it loads or once the account is gone. */
export function useLaneAccount(
	id: string | undefined,
): LaneAccount | undefined {
	const { data } = useQuery({
		...accountListQueryOptions,
		enabled: Boolean(id),
	});
	const account = id
		? data?.items?.find((a) => a.metadata.id === id)
		: undefined;
	return account
		? { name: account.metadata.name, label: displayLabel(account.metadata) }
		: undefined;
}
