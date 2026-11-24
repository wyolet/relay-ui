import { useQuery } from "@tanstack/react-query";
import { serviceAccountDetailQueryOptions } from "@/api/hooks/serviceAccounts";
import { serviceAccountScope } from "@/lib/serviceAccountScope";
import type { ShortcutTarget } from "@/shortcuts/registry";

/** The /keys/new search that opens the form on this service account; undefined until its owner is known. */
export function useNewKeySearch(
	target: ShortcutTarget,
): { principal: string; owner: string } | undefined {
	const { data: sa } = useQuery(serviceAccountDetailQueryOptions(target.name));
	const scope = sa && serviceAccountScope(sa);
	return scope ? { principal: target.id, owner: scope.id } : undefined;
}
