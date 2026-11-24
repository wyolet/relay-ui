import type { components } from "@/api/types.gen";
import type { ShortcutTargetKind } from "@/shortcuts/registry";

export type PseudoTarget = components["schemas"]["Target"];

/** A shortcut's target as relay's one-request bodies name it, by id. */
export function pseudoTarget({
	kind,
	id,
}: {
	kind: ShortcutTargetKind;
	id: string;
}): PseudoTarget {
	return { kind: kind === "serviceaccount" ? "service-account" : kind, id };
}
