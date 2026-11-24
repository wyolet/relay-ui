import { useQuery } from "@tanstack/react-query";
import { serviceAccountDetailQueryOptions } from "@/api/hooks/serviceAccounts";
import type { ShortcutTarget } from "@/shortcuts/registry";

/** The /keys/new search that opens the form on this service account; undefined until its project is known. */
export function useNewKeySearch(
	target: ShortcutTarget,
): { principal: string; project: string } | undefined {
	const { data: sa } = useQuery(serviceAccountDetailQueryOptions(target.name));
	return sa ? { principal: target.id, project: sa.spec.projectId } : undefined;
}
