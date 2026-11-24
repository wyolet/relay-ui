import { displayLabel } from "@/lib/displayLabel";
import type { ServiceAccountScope } from "@/lib/serviceAccountScope";
import type { ShortcutTargetKind } from "@/shortcuts/registry";

export const ACCESS_TARGET_KINDS = [
	"team",
	"project",
	"serviceaccount",
] as const satisfies readonly ShortcutTargetKind[];

export type AccessTargetKind = (typeof ACCESS_TARGET_KINDS)[number];

/** The team, project or user whose accounts, pools and policies apply. */
export type AccessScope = ServiceAccountScope;

const SCOPE_NOUN: Record<AccessScope["kind"], string> = {
	project: "project",
	team: "team",
	personal: "owner",
};

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
	/** A service account's owner. */
	scope?: AccessScope;
}

/** The target for a row; a service account's scope is its owner. */
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
	if (!row.scope) return undefined;
	return {
		...base,
		scope: row.scope,
		scopeLabel: `${label}'s ${SCOPE_NOUN[row.scope.kind]}`,
	};
}
