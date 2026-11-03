import type { components } from "@/api/types.gen";

type Owner = components["schemas"]["Owner"];

/** The caller's admin role, id, and the scopes it administers ("team:<id>", "project:<id>"). */
export interface ScopeCaller {
	isAdmin: boolean;
	userId: string | undefined;
	adminScopes: readonly string[];
}

/**
 * Whether the caller administers a row's owner: the user itself, an admin for
 * the system, an admin of the team or project otherwise. The server has the
 * last word.
 */
export function administersOwner(
	owner: Owner | undefined,
	caller: ScopeCaller,
): boolean {
	switch (owner?.kind) {
		case "user":
			return Boolean(owner.id) && owner.id === caller.userId;
		case "system":
			return caller.isAdmin;
		case "team":
		case "project":
			return (
				caller.isAdmin ||
				caller.adminScopes.includes(`${owner.kind}:${owner.id ?? ""}`)
			);
		default:
			return false;
	}
}

type OwnershipMetadata = Pick<
	components["schemas"]["Metadata"],
	"owner" | "catalogDetachedAt"
>;

/**
 * Resolves whether a catalog resource may be edited/deleted from the UI,
 * combining its owner kind with the server's governance guardrail.
 *
 * Mirrors relay's governance tiers for these kinds (policies, models, hosts,
 * providers): system-owned rows change only for an admin; team-, project- and
 * user-owned (or unowned) rows always may; catalog-managed rows (host- or
 * provider-owned) follow the governance flags.
 *
 * A row the catalog no longer ships (`catalogDetachedAt`) keeps its stored
 * owner but is governed as user-owned, as the relay does.
 *
 * The server enforces this independently; the UI only mirrors it so buttons
 * that would fail don't show.
 */
export function resolveMutability(
	metadata: OwnershipMetadata,
	gov: { allowEdit: boolean; allowDelete: boolean },
	isAdmin: boolean,
): { canEdit: boolean; canDelete: boolean } {
	const ownerKind = metadata.catalogDetachedAt ? "user" : metadata.owner?.kind;
	if (ownerKind === "host" || ownerKind === "provider")
		return { canEdit: gov.allowEdit, canDelete: gov.allowDelete };
	if (ownerKind === "system") return { canEdit: isAdmin, canDelete: isAdmin };
	return { canEdit: true, canDelete: true };
}

/**
 * Cumulative permission ladder for catalog-managed resources. Each rung
 * implies the one below it, so the two governance booleans collapse to a
 * single choice:
 *  - "off"    → read-only (no edit, no delete)
 *  - "write"  → may edit/toggle, not delete
 *  - "delete" → may edit and delete
 */
export type PermissionLevel = "off" | "write" | "delete";

export function isPermissionLevel(v: unknown): v is PermissionLevel {
	return v === "off" || v === "write" || v === "delete";
}

export function governanceToLevel(gov: {
	allowEdit: boolean;
	allowDelete: boolean;
}): PermissionLevel {
	// Delete implies write; treat a delete-without-edit row as the top rung.
	if (gov.allowDelete) return "delete";
	if (gov.allowEdit) return "write";
	return "off";
}

export function levelToGovernance(level: PermissionLevel): {
	allowEdit: boolean;
	allowDelete: boolean;
} {
	switch (level) {
		case "delete":
			return { allowEdit: true, allowDelete: true };
		case "write":
			return { allowEdit: true, allowDelete: false };
		default:
			return { allowEdit: false, allowDelete: false };
	}
}
