import type { OwnerPick } from "@/lib/ownerPick";
import type { ServiceAccountScope } from "@/lib/serviceAccountScope";
import type { WorkContext } from "@/lib/workContext";

export type AgentOwnerKind = "personal" | "team" | "project";

export const AGENT_OWNER_KINDS: readonly AgentOwnerKind[] = [
	"personal",
	"team",
	"project",
];

export type AgentOwnerPick = OwnerPick<AgentOwnerKind>;
export type AgentScope = ServiceAccountScope;

const NOT_PLACEABLE = "Relay places agents in projects only.";
export const PERSONAL_OFF = "Personal accounts are off on this relay.";

/** What the owner cards can't offer now: kinds relay doesn't take, and Personal while it is off. */
export interface OwnerLimits {
	/** `serviceAccountOwnerKinds` from the runtime config. */
	servedKinds: readonly string[];
	personalOff: boolean;
}

/** Why an owner card can't be picked; undefined while it can. The Project card always can. */
export function ownerUnavailable(
	kind: AgentOwnerKind,
	limits: OwnerLimits,
): string | undefined {
	if (kind === "project") return undefined;
	if (!limits.servedKinds.includes(kind === "personal" ? "user" : kind)) {
		return NOT_PLACEABLE;
	}
	return kind === "personal" && limits.personalOff ? PERSONAL_OFF : undefined;
}

const NO_PICK: AgentOwnerPick = {
	ownerKind: "project",
	teamId: "",
	projectId: "",
};

/** The owner card and pick a new agent starts on: the workspace when it can hold one. */
export function initialOwnerPick(
	current: WorkContext | undefined,
	limits: OwnerLimits,
): AgentOwnerPick {
	if (current?.kind === "project") {
		return { ...NO_PICK, projectId: current.id };
	}
	if (current?.kind === "team" && !ownerUnavailable("team", limits)) {
		return { ...NO_PICK, ownerKind: "team", teamId: current.id };
	}
	if (current?.kind === "personal" && !ownerUnavailable("personal", limits)) {
		return { ...NO_PICK, ownerKind: "personal" };
	}
	return NO_PICK;
}

/** The pick a copy of an agent owned by `scope` starts on: the same team or project, or the caller's own Personal for a user's. */
export function copiedOwnerPick(
	scope: AgentScope | undefined,
	limits: OwnerLimits,
): AgentOwnerPick {
	if (!scope || ownerUnavailable(scope.kind, limits)) return NO_PICK;
	switch (scope.kind) {
		case "project":
			return { ...NO_PICK, projectId: scope.id };
		case "team":
			return { ...NO_PICK, ownerKind: "team", teamId: scope.id };
		case "personal":
			return { ...NO_PICK, ownerKind: "personal" };
	}
}
