import { useQuery } from "@tanstack/react-query";
import { scopeIds, useAuth } from "@/api/auth";
import { keysListQuery } from "@/api/hooks/keys";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import {
	resolveWindow,
	type ScopeSpend,
	useFilteredSpend,
} from "@/api/hooks/usage";
import type { Key } from "@/api/types/key";
import type { Project } from "@/api/types/project";
import type { Team } from "@/api/types/team";

export interface ScopedHome {
	teams: Team[];
	projects: Project[];
	keys: Key[];
	/** Spend split per project over the current calendar month. */
	spend: ScopeSpend | null;
	spendUnavailable: boolean;
	/** Still resolving the lists the panels are built from. */
	pending: boolean;
}

/**
 * What a non-admin actor's home is built from: the teams and projects their
 * whoami scopes name, the keys issued to them, and this month's spend across
 * those projects. Every query is non-suspending and un-retried — an actor
 * who cannot list a kind gets an empty panel, not a broken page.
 */
export function useScopedHome(): ScopedHome {
	const { userId, scopes } = useAuth();
	const scopedTeamIds = new Set(scopeIds(scopes, "team"));
	const scopedProjectIds = new Set(scopeIds(scopes, "project"));

	const teams = useQuery({ ...teamsListQueryOptions, retry: false });
	const projects = useQuery({ ...projectsListQueryOptions, retry: false });
	const keys = useQuery({
		...keysListQuery({ principal_id: [userId ?? ""] }),
		enabled: Boolean(userId),
		retry: false,
	});

	const myTeams = (teams.data?.items ?? []).filter((t) =>
		scopedTeamIds.has(t.metadata.id ?? ""),
	);
	// A team-scoped binding reaches every project under that team, so those
	// projects belong on the home too — not just the directly-bound ones.
	const myProjects = (projects.data?.items ?? []).filter(
		(p) =>
			scopedProjectIds.has(p.metadata.id ?? "") ||
			scopedTeamIds.has(p.spec.teamId),
	);
	const projectIds = myProjects.flatMap((p) =>
		p.metadata.id ? [p.metadata.id] : [],
	);

	const { spend, unavailable } = useFilteredSpend(
		"project_id",
		resolveWindow("month"),
		{ project_id: projectIds },
		projectIds.length > 0,
	);

	return {
		teams: myTeams,
		projects: myProjects,
		keys: keys.data?.items ?? [],
		spend,
		spendUnavailable: unavailable,
		pending: teams.isPending || projects.isPending,
	};
}
