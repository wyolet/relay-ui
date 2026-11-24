import type { ServiceAccount } from "@/api/types/serviceAccount";
import type { components } from "@/api/types.gen";
import type { PickedScope } from "@/lib/ownerPick";

/** The project, team or user a service account belongs to; personal names the user. */
export type ServiceAccountScope = PickedScope<"personal" | "team" | "project">;

/** A service account owner with its id always named, the user's too. */
export type ServiceAccountOwner = Required<components["schemas"]["AgentOwner"]>;

/** The scope that owns a service account and the rows made for it; undefined while it names none. */
export function serviceAccountScope(
	sa: Pick<ServiceAccount, "metadata" | "spec">,
): ServiceAccountScope | undefined {
	const owner = sa.metadata.owner;
	const id = owner?.id ?? "";
	if (id && owner?.kind === "user") return { kind: "personal", id };
	if (id && (owner?.kind === "team" || owner?.kind === "project")) {
		return { kind: owner.kind, id };
	}
	if (sa.spec.userId) return { kind: "personal", id: sa.spec.userId };
	if (sa.spec.teamId) return { kind: "team", id: sa.spec.teamId };
	if (sa.spec.projectId) return { kind: "project", id: sa.spec.projectId };
	return undefined;
}

/** The owner rows made in the scope carry. */
export function serviceAccountScopeOwner(
	scope: ServiceAccountScope,
): ServiceAccountOwner {
	return {
		kind: scope.kind === "personal" ? "user" : scope.kind,
		id: scope.id,
	};
}

/** A service account's owner with its id named; undefined while it names none. */
export function serviceAccountOwner(
	sa: Pick<ServiceAccount, "metadata" | "spec">,
): ServiceAccountOwner | undefined {
	const scope = serviceAccountScope(sa);
	return scope && serviceAccountScopeOwner(scope);
}
