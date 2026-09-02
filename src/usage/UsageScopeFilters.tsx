import { useQuery } from "@tanstack/react-query";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { serviceAccountsListQueryOptions } from "@/api/hooks/serviceAccounts";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import type { UsageSummaryFilter } from "@/api/hooks/usage";
import { usersListQueryOptions } from "@/api/hooks/users";
import type { FilterOption } from "@/filters/types";
import { displayLabel } from "@/lib/displayLabel";
import { MultiSelect } from "@/shared/MultiSelect";

/** The tenancy slice the usage explorer is looking at, as the server's own
 * id filters — never a client-side join. */
export interface UsageScope {
	team_id: string[];
	project_id: string[];
	principal_id: string[];
}

export const EMPTY_USAGE_SCOPE: UsageScope = {
	team_id: [],
	project_id: [],
	principal_id: [],
};

/** Drop empty facets so an unfiltered page keeps the same query key (and
 * therefore the same cache entry) it had before the filters existed. */
export function usageScopeFilter(scope: UsageScope): UsageSummaryFilter {
	const filter: UsageSummaryFilter = {};
	if (scope.team_id.length) filter.team_id = scope.team_id;
	if (scope.project_id.length) filter.project_id = scope.project_id;
	if (scope.principal_id.length) filter.principal_id = scope.principal_id;
	return filter;
}

export function usageScopeCount(scope: UsageScope): number {
	return (
		scope.team_id.length + scope.project_id.length + scope.principal_id.length
	);
}

/** Team / project / principal pickers for the usage explorer. Each list is
 * fetched non-suspending and un-retried: an actor who cannot list one kind
 * gets an empty picker, not a broken toolbar. */
export function UsageScopeFilters({
	scope,
	onToggle,
}: {
	scope: UsageScope;
	onToggle: (key: keyof UsageScope, value: string) => void;
}) {
	const teams = useQuery({ ...teamsListQueryOptions, retry: false });
	const projects = useQuery({ ...projectsListQueryOptions, retry: false });
	const serviceAccounts = useQuery({
		...serviceAccountsListQueryOptions,
		retry: false,
	});
	const users = useQuery({ ...usersListQueryOptions, retry: false });

	const teamOptions = metadataOptions(teams.data?.items);
	const projectOptions = metadataOptions(projects.data?.items);
	// A principal is a service account or a user account; both can own a key.
	const principalOptions: FilterOption[] = [
		...metadataOptions(serviceAccounts.data?.items),
		...(users.data ?? []).map((u) => ({
			value: u.id,
			label: u.username || u.email || u.id,
		})),
	];

	return (
		<div className="flex flex-wrap items-center gap-2">
			<MultiSelect
				label="Team"
				options={teamOptions}
				selected={scope.team_id}
				onToggle={(v) => onToggle("team_id", v)}
			/>
			<MultiSelect
				label="Project"
				options={projectOptions}
				selected={scope.project_id}
				onToggle={(v) => onToggle("project_id", v)}
			/>
			<MultiSelect
				label="Principal"
				options={principalOptions}
				selected={scope.principal_id}
				onToggle={(v) => onToggle("principal_id", v)}
			/>
		</div>
	);
}

function metadataOptions(
	items:
		| readonly {
				metadata: { id?: string; name: string; displayName?: string };
		  }[]
		| null
		| undefined,
): FilterOption[] {
	return (items ?? []).flatMap((it) =>
		it.metadata.id
			? [{ value: it.metadata.id, label: displayLabel(it.metadata) }]
			: [],
	);
}
