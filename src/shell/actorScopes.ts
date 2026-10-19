import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/api/auth";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import type { Project } from "@/api/types/project";
import type { Team } from "@/api/types/team";
import { scopeNames } from "@/lib/ownerScopes";

export interface ScopeLabel {
	/** The raw "team:<id>" / "project:<id>" string whoami reported. */
	scope: string;
	kind: string;
	name: string;
}

const KIND_LABEL: Record<string, string> = {
	team: "Team",
	project: "Project",
};

/**
 * Names the scopes whoami reports. An actor who cannot list a kind keeps the
 * raw id — the scope is still theirs, we just can't spell it out.
 */
export function scopeLabels(
	scopes: readonly string[],
	teams: readonly Team[],
	projects: readonly Project[],
): ScopeLabel[] {
	const names = scopeNames(teams, projects);
	return scopes.map((scope) => {
		const sep = scope.indexOf(":");
		const kind = sep < 0 ? scope : scope.slice(0, sep);
		const id = sep < 0 ? "" : scope.slice(sep + 1);
		return {
			scope,
			kind: KIND_LABEL[kind] ?? kind,
			name: names.get(scope) ?? id,
		};
	});
}

/** The actor's roles and named scopes, for the read-only account menu. */
export function useActorAccess(): { roles: string[]; scopes: ScopeLabel[] } {
	const { roles, scopes } = useAuth();
	const wantsTeams = scopes.some((s) => s.startsWith("team:"));
	const wantsProjects = scopes.some((s) => s.startsWith("project:"));

	const teams = useQuery({
		...teamsListQueryOptions,
		enabled: wantsTeams,
		retry: false,
	});
	const projects = useQuery({
		...projectsListQueryOptions,
		enabled: wantsProjects,
		retry: false,
	});

	return {
		roles,
		scopes: scopeLabels(
			scopes,
			teams.data?.items ?? [],
			projects.data?.items ?? [],
		),
	};
}
