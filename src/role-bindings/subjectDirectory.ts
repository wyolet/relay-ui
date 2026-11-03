import type { FilterOption } from "@/filters/types";

interface Named {
	id: string;
	name: string;
	label: string;
}

/** The subjects a role binding may name, as the people reading it know them. */
export interface SubjectDirectory {
	users: readonly Named[];
	groups: readonly Named[];
	serviceAccounts: readonly Named[];
}

interface Subject {
	kind: "user" | "group" | "serviceaccount";
	id?: string;
	name?: string;
}

const KIND_LABEL: Record<Subject["kind"], string> = {
	user: "User",
	group: "Group",
	serviceaccount: "Service",
};

/** relay's `subject` filter value: kind and id, a group by name. */
function filterValue(kind: Subject["kind"], row: Named): string {
	return `${kind}:${kind === "group" ? row.name : row.id}`;
}

/** The Subject filter's choices, users first. */
export function subjectFilterOptions(dir: SubjectDirectory): FilterOption[] {
	const of = (kind: Subject["kind"], rows: readonly Named[]) =>
		rows.map((r) => ({
			value: filterValue(kind, r),
			label: `${KIND_LABEL[kind]} · ${r.label}`,
		}));
	return [
		...of("user", dir.users),
		...of("group", dir.groups),
		...of("serviceaccount", dir.serviceAccounts),
	];
}

/** "User · alice"; a subject the caller can't look up keeps its raw reference. */
export function subjectDisplay(
	s: Subject,
	dir: SubjectDirectory,
): { text: string; known: boolean } {
	const rows =
		s.kind === "user"
			? dir.users
			: s.kind === "group"
				? dir.groups
				: dir.serviceAccounts;
	const row = rows.find((r) =>
		s.kind === "group" ? r.name === s.name || r.id === s.id : r.id === s.id,
	);
	return row
		? { text: `${KIND_LABEL[s.kind]} · ${row.label}`, known: true }
		: { text: `${s.kind}:${s.name ?? s.id ?? ""}`, known: false };
}
