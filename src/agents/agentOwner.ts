import type { components } from "@/api/types.gen";
import type { OwnerPick, PickedScope } from "@/lib/ownerPick";
import type { WorkContext } from "@/lib/workContext";

type AccountReceiver = components["schemas"]["AccountReceiver"];

export type AgentOwnerKind = "personal" | "team" | "project";

export const AGENT_OWNER_KINDS: readonly AgentOwnerKind[] = [
	"personal",
	"team",
	"project",
];

// POST /service-accounts takes a project only (spec.projectId is required).
const PLACEABLE_KINDS: readonly AgentOwnerKind[] = ["project"];

export function ownerKindPlaceable(kind: AgentOwnerKind): boolean {
	return PLACEABLE_KINDS.includes(kind);
}

export type AgentOwnerPick = OwnerPick<AgentOwnerKind>;
export type AgentScope = PickedScope<AgentOwnerKind>;

export function scopeReceiver(scope: AgentScope): AccountReceiver {
	return {
		kind: scope.kind === "personal" ? "user" : scope.kind,
		id: scope.id,
	};
}

/** The owner card and pick a new agent starts on: the workspace when it can hold one. */
export function initialOwnerPick(
	current: WorkContext | undefined,
): AgentOwnerPick {
	if (current?.kind === "project") {
		return { ownerKind: "project", teamId: "", projectId: current.id };
	}
	return { ownerKind: "project", teamId: "", projectId: "" };
}
