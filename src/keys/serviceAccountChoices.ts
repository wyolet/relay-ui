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

/**
 * The owners the key form narrows service accounts by: every project, then
 * each team or user that owns a listed service account, by owner id.
 */
export function serviceAccountOwnerChoices(
	projects: readonly Choice[],
	serviceAccounts: readonly ServiceAccount[],
	ownerLabel: (scope: ServiceAccountScope) => string,
): Choice[] {
	const listed = new Set(projects.map((p) => p.value));
	const owners: Choice[] = [];
	for (const sa of serviceAccounts) {
		const scope = serviceAccountScope(sa);
		if (!scope || scope.kind === "project" || listed.has(scope.id)) continue;
		listed.add(scope.id);
		owners.push({ value: scope.id, label: ownerLabel(scope) });
	}
	return [...projects, ...owners];
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
