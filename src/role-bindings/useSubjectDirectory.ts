import { useQuery } from "@tanstack/react-query";
import { groupsListQueryOptions } from "@/api/hooks/groups";
import { serviceAccountsListQueryOptions } from "@/api/hooks/serviceAccounts";
import { usersListQueryOptions } from "@/api/hooks/users";
import { displayLabel } from "@/lib/displayLabel";
import type { SubjectDirectory } from "@/role-bindings/subjectDirectory";

/** Users, groups and service accounts the caller may list; a list it can't read stays empty. */
export function useSubjectDirectory(): SubjectDirectory {
	const users = useQuery({ ...usersListQueryOptions, retry: false });
	const groups = useQuery({ ...groupsListQueryOptions, retry: false });
	const sas = useQuery({ ...serviceAccountsListQueryOptions, retry: false });
	return {
		users: (users.data ?? []).map((u) => ({
			id: u.id,
			name: u.username,
			label: u.username,
		})),
		groups: (groups.data?.items ?? []).map((g) => ({
			id: g.metadata.id ?? "",
			name: g.metadata.name,
			label: displayLabel(g.metadata),
		})),
		serviceAccounts: (sas.data?.items ?? []).map((s) => ({
			id: s.metadata.id ?? "",
			name: s.metadata.name,
			label: displayLabel(s.metadata),
		})),
	};
}
