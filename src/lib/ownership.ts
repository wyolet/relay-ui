import type { components } from "@/api/types.gen";

type OwnershipMetadata = Pick<
	components["schemas"]["Metadata"],
	"owner" | "catalogDetachedAt"
>;

/**
 * Resolves whether a catalog resource may be edited/deleted from the UI,
 * combining its owner kind with the server's governance guardrail.
 *
 * Three tiers, matching the relay's own enforcement:
 *  - system-owned → protected in code regardless; never mutable.
 *  - user-owned (or unowned) → bypasses governance; always mutable.
 *  - catalog-managed (host/provider-synced) → gated by the governance flags.
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
): { canEdit: boolean; canDelete: boolean } {
	const ownerKind = metadata.catalogDetachedAt ? "user" : metadata.owner?.kind;
	if (ownerKind === "system") return { canEdit: false, canDelete: false };
	if (!ownerKind || ownerKind === "user")
		return { canEdit: true, canDelete: true };
	return { canEdit: gov.allowEdit, canDelete: gov.allowDelete };
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
