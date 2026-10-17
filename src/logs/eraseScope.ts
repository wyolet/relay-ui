import type { EraseScope } from "@/api/hooks/logs";

/** A project or principal the erase is narrowed to. `name` is what the
 * operator types to confirm; `label` is how the UI names it. */
export interface EraseTarget {
	id: string;
	name: string;
	label: string;
	kind: "project" | "user" | "service account";
}

export interface EraseSelection {
	project?: EraseTarget;
	principal?: EraseTarget;
}

/** The name to type: the narrowest target, so both together confirm the principal. */
export function eraseConfirmName(sel: EraseSelection): string | undefined {
	return sel.principal?.name ?? sel.project?.name;
}

/** "project Acme", "user alice", or "user alice in project Acme". */
export function describeEraseScope(sel: EraseSelection): string | undefined {
	const { project, principal } = sel;
	if (principal && project) {
		return `${principal.kind} ${principal.label} in project ${project.label}`;
	}
	const only = principal ?? project;
	return only && `${only.kind} ${only.label}`;
}

export function toEraseBody(sel: EraseSelection): EraseScope {
	const body: EraseScope = {};
	if (sel.project) body.projectId = sel.project.id;
	if (sel.principal) body.principalId = sel.principal.id;
	return body;
}
