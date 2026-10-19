import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/api/auth";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import type { components } from "@/api/types.gen";
import {
	defaultOwnerKey,
	type OwnerScopeKind,
	ownerFromKey,
	ownerKey,
	ownerOptions,
} from "@/lib/ownerScopes";

type Owner = components["schemas"]["Owner"];

interface UseOwnerOptionsArgs {
	kinds: readonly OwnerScopeKind[];
	/** The edited row's owner; undefined on create. */
	owner?: Owner;
	/** The value an admin's create form starts on. */
	preset?: string;
}

/** Owner choices for a create/edit form, the value it starts on, and the owner a value sends. */
export function useOwnerOptions({
	kinds,
	owner,
	preset = "",
}: UseOwnerOptionsArgs) {
	const { isAdmin, scopes, userId } = useAuth();
	const listsKind = (kind: OwnerScopeKind) =>
		kinds.includes(kind) &&
		(isAdmin || scopes.some((s) => s.startsWith(`${kind}:`)));

	const teams = useQuery({
		...teamsListQueryOptions,
		enabled: listsKind("team"),
		retry: false,
	});
	const projects = useQuery({
		...projectsListQueryOptions,
		enabled: listsKind("project"),
		retry: false,
	});

	const initialOwner = owner
		? ownerKey(owner, userId)
		: defaultOwnerKey({ kinds, isAdmin, scopes, preset });

	const options = ownerOptions({
		kinds,
		isAdmin,
		scopes,
		teams: teams.data?.items ?? [],
		projects: projects.data?.items ?? [],
		keep: [initialOwner],
	});

	// An untouched owner sends the row's own value back unchanged.
	function toOwner(key: string): Owner {
		if (owner && key === initialOwner) return owner;
		return ownerFromKey(key, owner ? userId : undefined);
	}

	return { options, initialOwner, toOwner };
}
