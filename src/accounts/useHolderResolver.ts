import { useQuery } from "@tanstack/react-query";
import { type HolderView, resolveHolder } from "@/accounts/accountView";
import { serviceAccountsListQueryOptions } from "@/api/hooks/serviceAccounts";
import { usersListQueryOptions } from "@/api/hooks/users";
import type { components } from "@/api/types.gen";

type AccountHolder = components["schemas"]["AccountHolder"];

/** Resolves holders to names; non-suspending, so a caller who may not list users still sees short ids. */
export function useHolderResolver(): (holder: AccountHolder) => HolderView {
	const { data: users } = useQuery(usersListQueryOptions);
	const { data: serviceAccounts } = useQuery(serviceAccountsListQueryOptions);
	const sources = {
		users: users ?? [],
		serviceAccounts: serviceAccounts?.items ?? [],
	};
	return (holder) => resolveHolder(holder, sources);
}
