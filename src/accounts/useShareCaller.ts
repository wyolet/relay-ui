import { useQuery } from "@tanstack/react-query";
import type { ShareCaller } from "@/accounts/sharing";
import { useAuth } from "@/api/auth";
import { myContextsQueryOptions } from "@/api/hooks/contexts";

/** The caller's admin role, id, and the teams and projects it administers. */
export function useShareCaller(): ShareCaller {
	const { isAdmin, userId } = useAuth();
	const { data } = useQuery(myContextsQueryOptions);
	const adminScopes = (data ?? []).flatMap((c) =>
		c.admin && c.kind !== "personal" ? [`${c.kind}:${c.id}`] : [],
	);
	return { isAdmin, userId, adminScopes };
}
