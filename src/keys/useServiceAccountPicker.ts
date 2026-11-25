import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/api/auth";
import { useProjects } from "@/api/hooks/projects";
import { serviceAccountsListQueryOptions } from "@/api/hooks/serviceAccounts";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { usersListQueryOptions } from "@/api/hooks/users";
import {
	ownedServiceAccountChoices,
	serviceAccountOwnerGroups,
} from "@/keys/serviceAccountChoices";
import { displayLabel } from "@/lib/displayLabel";
import {
	type ServiceAccountScope,
	serviceAccountScope,
} from "@/lib/serviceAccountScope";

const shortId = (id: string) => `${id.slice(0, 8)}…`;

/** The principal a key authenticates as. */
export interface KeyPrincipalRef {
	kind: "user" | "serviceaccount";
	id: string;
}

/**
 * The key form's principal picker: an owner, then a service account it holds;
 * and the name of the principal a key already has.
 */
export function useServiceAccountPicker(
	ownerId: string,
	principal?: KeyPrincipalRef,
) {
	const { userId, username } = useAuth();
	const { data: projects } = useProjects();
	const { data: serviceAccounts } = useQuery(serviceAccountsListQueryOptions);
	const items = serviceAccounts?.items ?? [];
	const { data: teams } = useQuery(teamsListQueryOptions);
	const othersOwn = items.some((sa) => {
		const scope = serviceAccountScope(sa);
		return scope?.kind === "personal" && scope.id !== userId;
	});
	const otherUserPrincipal =
		principal?.kind === "user" &&
		principal.id !== "" &&
		principal.id !== userId;
	const { data: users } = useQuery({
		...usersListQueryOptions,
		enabled: othersOwn || otherUserPrincipal,
	});

	function userLabel(id: string): string {
		if (id === userId) return username ?? shortId(id);
		return users?.find((u) => u.id === id)?.username ?? shortId(id);
	}

	function ownerLabel(scope: ServiceAccountScope): string {
		if (scope.kind === "personal") {
			return scope.id === userId ? "Personal" : userLabel(scope.id);
		}
		const team = (teams?.items ?? []).find((t) => t.metadata.id === scope.id);
		return team ? displayLabel(team.metadata) : shortId(scope.id);
	}

	function principalLabel(): string {
		if (!principal?.id) return "";
		if (principal.kind === "user") return userLabel(principal.id);
		const sa = items.find((s) => s.metadata.id === principal.id);
		return sa ? displayLabel(sa.metadata) : shortId(principal.id);
	}

	const projectChoices = (projects.items ?? []).map((p) => ({
		value: p.metadata.id ?? "",
		label: displayLabel(p.metadata),
	}));
	const ownerGroups = serviceAccountOwnerGroups(
		projectChoices,
		items,
		ownerLabel,
	);
	return {
		ownerGroups,
		ownerOptions: ownerGroups.flatMap((g) => g.options),
		serviceAccountOptions: ownedServiceAccountChoices(items, ownerId),
		principalLabel: principalLabel(),
	};
}
