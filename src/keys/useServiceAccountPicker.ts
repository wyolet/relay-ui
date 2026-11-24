import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/api/auth";
import { useProjects } from "@/api/hooks/projects";
import { serviceAccountsListQueryOptions } from "@/api/hooks/serviceAccounts";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { usersListQueryOptions } from "@/api/hooks/users";
import {
	ownedServiceAccountChoices,
	serviceAccountOwnerChoices,
} from "@/keys/serviceAccountChoices";
import { displayLabel } from "@/lib/displayLabel";
import {
	type ServiceAccountScope,
	serviceAccountScope,
} from "@/lib/serviceAccountScope";

const shortId = (id: string) => `${id.slice(0, 8)}…`;

/** The key form's principal picker: an owner, then a service account it holds. */
export function useServiceAccountPicker(ownerId: string) {
	const { userId } = useAuth();
	const { data: projects } = useProjects();
	const { data: serviceAccounts } = useQuery(serviceAccountsListQueryOptions);
	const items = serviceAccounts?.items ?? [];
	const { data: teams } = useQuery(teamsListQueryOptions);
	const othersOwn = items.some((sa) => {
		const scope = serviceAccountScope(sa);
		return scope?.kind === "personal" && scope.id !== userId;
	});
	const { data: users } = useQuery({
		...usersListQueryOptions,
		enabled: othersOwn,
	});

	function ownerLabel(scope: ServiceAccountScope): string {
		if (scope.kind === "personal") {
			if (scope.id === userId) return "Personal";
			const user = users?.find((u) => u.id === scope.id);
			return `User ${user?.username ?? shortId(scope.id)}`;
		}
		const team = (teams?.items ?? []).find((t) => t.metadata.id === scope.id);
		return `Team ${team ? displayLabel(team.metadata) : shortId(scope.id)}`;
	}

	const projectChoices = (projects.items ?? []).map((p) => ({
		value: p.metadata.id ?? "",
		label: displayLabel(p.metadata),
	}));
	return {
		ownerOptions: serviceAccountOwnerChoices(projectChoices, items, ownerLabel),
		serviceAccountOptions: ownedServiceAccountChoices(items, ownerId),
	};
}
