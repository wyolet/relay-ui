import { useQuery } from "@tanstack/react-query";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { subjectKey } from "@/api/hooks/policyBindings";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { serviceAccountsListQueryOptions } from "@/api/hooks/serviceAccounts";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { usersListQueryOptions } from "@/api/hooks/users";
import type { PolicyBindingSubject } from "@/api/types/policyBinding";
import { displayLabel } from "@/lib/displayLabel";
import {
	OFFERED_SUBJECT_KINDS,
	type OfferedSubjectKind,
} from "@/policy-bindings/subjects";

export interface SubjectOption {
	value: string;
	label: string;
}

type Named = { metadata: { id?: string; name: string; displayName?: string } };

function toOptions(rows: readonly Named[] | null | undefined): SubjectOption[] {
	return (rows ?? []).flatMap((r) =>
		r.metadata.id
			? [{ value: r.metadata.id, label: displayLabel(r.metadata) }]
			: [],
	);
}

/**
 * Pickable rows per subject kind and a name lookup for stored subjects.
 * Lists load non-suspending; a list the caller may not read stays empty.
 */
export function useSubjectOptions() {
	const users = useQuery(usersListQueryOptions);
	const serviceAccounts = useQuery(serviceAccountsListQueryOptions);
	const teams = useQuery({ ...teamsListQueryOptions, retry: false });
	const projects = useQuery({ ...projectsListQueryOptions, retry: false });
	const accounts = useQuery({ ...accountListQueryOptions, retry: false });

	const options: Record<OfferedSubjectKind, SubjectOption[]> = {
		user: (users.data ?? []).map((u) => ({ value: u.id, label: u.username })),
		serviceaccount: toOptions(serviceAccounts.data?.items),
		team: toOptions(teams.data?.items),
		project: toOptions(projects.data?.items),
		account: toOptions(accounts.data?.items),
	};

	const names = new Map<string, string>();
	for (const kind of OFFERED_SUBJECT_KINDS) {
		for (const o of options[kind])
			names.set(subjectKey({ kind, id: o.value }), o.label);
	}

	/** The subject's name, or a shortened id when no list holds it. */
	function subjectName(subject: PolicyBindingSubject): string {
		return names.get(subjectKey(subject)) ?? `${subject.id.slice(0, 8)}…`;
	}

	/** The name a "<kind>:<id>" key resolves to, undefined when unknown. */
	function nameOfKey(key: string): string | undefined {
		return names.get(key);
	}

	return { options, subjectName, nameOfKey };
}
