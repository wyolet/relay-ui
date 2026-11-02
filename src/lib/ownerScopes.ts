import type { Project } from "@/api/types/project";
import type { Team } from "@/api/types/team";
import type { components } from "@/api/types.gen";
import { displayLabel } from "@/lib/displayLabel";

type Owner = components["schemas"]["Owner"];

/** Key for the caller's own personal scope. */
export const PERSONAL_OWNER = "user";

export interface OwnerOption {
	/** The team or project id. */
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

/** A row owner as one string; the caller's own user owner is {@link PERSONAL_OWNER}. */
export function ownerKey(
	owner: Owner | undefined,
	actorUserId: string | undefined,
): string {
	const kind = owner?.kind ?? "";
	const id = owner?.id ?? "";
	if (kind === "user" && (!id || id === actorUserId)) return PERSONAL_OWNER;
	return id ? `${kind}:${id}` : kind;
}
