import type { Project } from "@/api/types/project";
import type { Team } from "@/api/types/team";
import type { components } from "@/api/types.gen";
import { displayLabel } from "@/lib/displayLabel";

type Owner = components["schemas"]["Owner"];

/** The scopes a row can be created in. */
export type OwnerScopeKind = "user" | "team" | "project";

export const ALL_OWNER_SCOPES: readonly OwnerScopeKind[] = [
	"user",
	"team",
	"project",
];

/** Form value for the caller's own personal scope. */
export const PERSONAL_OWNER = "user";

export interface OwnerOption {
	/** {@link PERSONAL_OWNER}, or "<kind>:<id>" — the shape whoami reports scopes in. */
	value: string;
	kind: string;
	label: string;
}

/** Display names keyed "team:<id>" / "project:<id>". */
export function scopeNames(
	teams: readonly Team[],
	projects: readonly Project[],
): Map<string, string> {
	const names = new Map<string, string>();
	for (const t of teams) {
		if (t.metadata.id)
			names.set(`team:${t.metadata.id}`, displayLabel(t.metadata));
	}
	for (const p of projects) {
		if (p.metadata.id)
			names.set(`project:${p.metadata.id}`, displayLabel(p.metadata));
	}
	return names;
}

function splitKey(key: string): { kind: string; id: string } {
	const sep = key.indexOf(":");
	return sep < 0
		? { kind: key, id: "" }
		: { kind: key.slice(0, sep), id: key.slice(sep + 1) };
}

/** The form value for a row's owner; the caller's own user owner is {@link PERSONAL_OWNER}. */
export function ownerKey(
	owner: Owner | undefined,
	actorUserId: string | undefined,
): string {
	const kind = owner?.kind ?? "";
	const id = owner?.id ?? "";
	if (kind === "user" && (!id || id === actorUserId)) return PERSONAL_OWNER;
	return id ? `${kind}:${id}` : kind;
}

/**
 * The owner a form value sends. Personal carries the caller's id when given:
 * an update naming only `kind: user` keeps whichever user owns the row.
 */
export function ownerFromKey(key: string, actorUserId?: string): Owner {
	if (key === PERSONAL_OWNER) {
		return actorUserId ? { kind: "user", id: actorUserId } : { kind: "user" };
	}
	const { kind, id } = splitKey(key);
	return id ? { kind, id } : { kind };
}

/** The id half of a "<kind>:<id>" form value. */
export function ownerKeyId(key: string): string {
	return splitKey(key).id;
}

function optionLabel(key: string, names: ReadonlyMap<string, string>): string {
	if (key === PERSONAL_OWNER) return "Personal";
	const { kind, id } = splitKey(key);
	return names.get(key) ?? (id ? `${id.slice(0, 8)}…` : kind);
}

interface OwnerOptionsInput {
	kinds: readonly OwnerScopeKind[];
	isAdmin: boolean;
	/** whoami scopes, "team:<id>" / "project:<id>". */
	scopes: readonly string[];
	teams: readonly Team[];
	projects: readonly Project[];
	/** Values that stay selectable even outside the caller's scopes — the edited row's owner. */
	keep: readonly string[];
}

/**
 * The scopes the caller may create in: every listed team and project for an
 * admin, the caller's own scopes otherwise, plus personal where the kind allows.
 */
export function ownerOptions({
	kinds,
	isAdmin,
	scopes,
	teams,
	projects,
	keep,
}: OwnerOptionsInput): OwnerOption[] {
	const allowed = new Set<string>(kinds);
	const names = scopeNames(teams, projects);
	const tenantScopes = isAdmin
		? [
				...teams.flatMap((t) =>
					t.metadata.id ? [`team:${t.metadata.id}`] : [],
				),
				...projects.flatMap((p) =>
					p.metadata.id ? [`project:${p.metadata.id}`] : [],
				),
			]
		: scopes;
	const byKind = (kind: string) =>
		tenantScopes.filter((s) => allowed.has(kind) && splitKey(s).kind === kind);
	const values = [
		...(allowed.has("user") ? [PERSONAL_OWNER] : []),
		...byKind("team"),
		...byKind("project"),
		...keep.filter((k) => k !== ""),
	];
	return [...new Set(values)].map((value) => ({
		value,
		kind: splitKey(value).kind,
		label: optionLabel(value, names),
	}));
}

interface DefaultOwnerInput {
	kinds: readonly OwnerScopeKind[];
	isAdmin: boolean;
	scopes: readonly string[];
	/** What the create form starts on for an admin; a scoped caller keeps it only inside their scopes. */
	preset: string;
}

/** The owner a create form starts on; "" leaves the choice to the caller. */
export function defaultOwnerKey({
	kinds,
	isAdmin,
	scopes,
	preset,
}: DefaultOwnerInput): string {
	if (isAdmin) return preset;
	const allowed = new Set<string>(kinds);
	const scoped = scopes.filter((s) => allowed.has(splitKey(s).kind));
	if (preset !== PERSONAL_OWNER && scoped.includes(preset)) return preset;
	const projectScopes = scoped.filter((s) => splitKey(s).kind === "project");
	if (projectScopes.length === 1) return projectScopes[0] ?? "";
	if (allowed.has("user")) return PERSONAL_OWNER;
	return scoped.length === 1 ? (scoped[0] ?? "") : "";
}
