import type { components } from "@/api/types.gen";

type Owner = components["schemas"]["Owner"];

/** Key for the caller's own personal scope. */
export const PERSONAL_OWNER = "user";

export interface OwnerOption {
	/** The team or project id. */
	value: string;
	kind: string;
	label: string;
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
