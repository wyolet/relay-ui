import type { components } from "@/api/types.gen";

type Owner = components["schemas"]["Owner"];

/** Where a role binding grants: the whole organization, or a team or project. */
export type ScopeKind = "organization" | "team" | "project";

/** Relay reads a system scope from before the organization owner as the organization. */
export function scopeKindOf(scope: Owner): ScopeKind {
	return scope.kind === "team" || scope.kind === "project"
		? scope.kind
		: "organization";
}

export function isGlobalScope(scope: Owner): boolean {
	return scopeKindOf(scope) === "organization";
}
