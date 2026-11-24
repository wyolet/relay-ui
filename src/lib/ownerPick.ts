import type { components } from "@/api/types.gen";

type Owner = components["schemas"]["Owner"];

export type OwnerPickKind = "personal" | "team" | "project" | "organization";

/** A form's owner choice: the kind, and the team or project picked for it. */
export interface OwnerPick<K extends OwnerPickKind = OwnerPickKind> {
	ownerKind: K;
	teamId: string;
	projectId: string;
}

/** The scope a pick resolves to; `id` is "" for the organization. */
export interface PickedScope<K extends OwnerPickKind = OwnerPickKind> {
	kind: K;
	id: string;
}

/** A form's field setter, as an owner pick writes through it. */
export interface OwnerPickSetter<K extends OwnerPickKind> {
	(field: "ownerKind", value: K): void;
	(field: "teamId" | "projectId", value: string): void;
}

/** Sets the fields a partial pick names, through the form's `set`. */
export function applyOwnerPick<K extends OwnerPickKind>(
	pick: Partial<OwnerPick<K>>,
	set: OwnerPickSetter<K>,
): void {
	if (pick.ownerKind) set("ownerKind", pick.ownerKind);
	if (pick.teamId !== undefined) set("teamId", pick.teamId);
	if (pick.projectId !== undefined) set("projectId", pick.projectId);
}

/** The picked scope; undefined until its team or project is picked. */
export function pickedScope<K extends OwnerPickKind>(
	pick: OwnerPick<K>,
	userId: string | undefined,
): PickedScope<K> | undefined {
	if (pick.ownerKind === "organization")
		return { kind: pick.ownerKind, id: "" };
	const id =
		pick.ownerKind === "personal"
			? (userId ?? "")
			: pick.ownerKind === "team"
				? pick.teamId
				: pick.projectId;
	return id ? { kind: pick.ownerKind, id } : undefined;
}

/** The owner a create in the scope sends; personal sends none. */
export function scopeOwner(scope: PickedScope): Owner | undefined {
	if (scope.kind === "personal") return undefined;
	if (scope.kind === "organization") return { kind: "organization" };
	return { kind: scope.kind, id: scope.id };
}

/** The `usable_by` filter value for pickers in the scope. */
export function scopeUsableBy(scope: PickedScope): string {
	if (scope.kind === "organization") return "organization";
	return `${scope.kind === "personal" ? "user" : scope.kind}:${scope.id}`;
}

/** The scope as {@link ownerKey} writes a row owner. */
export function scopeOwnerKey(scope: PickedScope): string {
	if (scope.kind === "personal") return "user";
	if (scope.kind === "organization") return "organization";
	return `${scope.kind}:${scope.id}`;
}
