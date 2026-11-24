import { displayLabel } from "@/lib/displayLabel";
import type { PickedScope } from "@/lib/ownerPick";
import type { ShortcutTargetKind } from "@/shortcuts/registry";

export const ACCESS_TARGET_KINDS = [
	"team",
	"project",
	"serviceaccount",
] as const satisfies readonly ShortcutTargetKind[];

export type AccessTargetKind = (typeof ACCESS_TARGET_KINDS)[number];

/** The team or project whose accounts, pools and policies apply. */
export type AccessScope = PickedScope<"team" | "project">;

/** The team, project or service account whose access the form sets. */
export interface AccessTarget {
	kind: AccessTargetKind;
	id: string;
	/** Slug, for the link back to its page. */
	name: string;
	label: string;
	scope: AccessScope;
	/** How share labels name the scope. */
	scopeLabel: string;
	/** The target's own account, the one bound to the policy. */
	accountId: string;
}

/** A team, project or service account row as the form reads it. */
export interface AccessTargetRow {
	metadata: { id?: string; name: string; displayName?: string };
	/** A service account's project. */
	projectId?: string;
}

/** The target for a row; a service account's scope is its project. */
export function accessTarget(
	kind: AccessTargetKind,
	row: AccessTargetRow,
	accountId: string,
): AccessTarget | undefined {
	const id = row.metadata.id;
	if (!id) return undefined;
	const label = displayLabel(row.metadata);
	const base = { kind, id, name: row.metadata.name, label, accountId };
	if (kind !== "serviceaccount") {
		return { ...base, scope: { kind, id }, scopeLabel: label };
	}
	if (!row.projectId) return undefined;
	return {
		...base,
		scope: { kind: "project", id: row.projectId },
		scopeLabel: `${label}'s project`,
	};
}
