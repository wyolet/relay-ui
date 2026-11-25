import type { ServiceAccount } from "@/api/types/serviceAccount";
import { displayLabel } from "@/lib/displayLabel";
import {
	type ServiceAccountScope,
	serviceAccountScope,
} from "@/lib/serviceAccountScope";

export interface Choice {
	value: string;
	label: string;
}

export interface ChoiceGroup {
	label: string;
	options: Choice[];
}

/**
 * The owners the key form narrows service accounts by, grouped by kind:
 * every project, then each team or user that owns a listed service account
 * once. Empty groups are left out.
 */
export function serviceAccountOwnerGroups(
	projects: readonly Choice[],
	serviceAccounts: readonly ServiceAccount[],
	ownerLabel: (scope: ServiceAccountScope) => string,
): ChoiceGroup[] {
	const listed = new Set(projects.map((p) => p.value));
	const teams: Choice[] = [];
	const users: Choice[] = [];
	for (const sa of serviceAccounts) {
		const scope = serviceAccountScope(sa);
		if (!scope || scope.kind === "project" || listed.has(scope.id)) continue;
		listed.add(scope.id);
		const choice = { value: scope.id, label: ownerLabel(scope) };
		(scope.kind === "team" ? teams : users).push(choice);
	}
	return [
		{ label: "Projects", options: [...projects] },
		{ label: "Teams", options: teams },
		{ label: "Users", options: users },
	].filter((g) => g.options.length > 0);
}

/** The service accounts the picked owner holds. */
export function ownedServiceAccountChoices(
	serviceAccounts: readonly ServiceAccount[],
	ownerId: string,
): Choice[] {
	return serviceAccounts.flatMap((sa) =>
		sa.metadata.id && serviceAccountScope(sa)?.id === ownerId
			? [{ value: sa.metadata.id, label: displayLabel(sa.metadata) }]
			: [],
	);
}
