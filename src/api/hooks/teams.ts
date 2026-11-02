import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { DetachedLinks } from "@/api/types/errors";
import type { Team, TeamList } from "@/api/types/team";
import type { operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

/** Server-side filter/sort/page params accepted by GET /teams. */
export type TeamsListParams = NonNullable<
	operations["list_teams"]["parameters"]["query"]
>;

export const teamsListQueryOptions = queryOptions({
	queryKey: ["teams"] as const,
	queryFn: async (): Promise<TeamList> => {
		const data = unwrap(await apiClient.GET("/teams"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function teamsListQuery(params: TeamsListParams) {
	return queryOptions({
		queryKey: ["teams", "list", params] as const,
		queryFn: async (): Promise<TeamList> => {
			const data = unwrap(
				await apiClient.GET("/teams", { params: { query: params } }),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function teamDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["teams", ref] as const,
		queryFn: async (): Promise<Team> => {
			const data = unwrap(
				await apiClient.GET("/teams/{ref}", { params: { path: { ref } } }),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function teamReferencesQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["teams", "references", id] as const,
		queryFn: async () => {
			const data = unwrap(
				await apiClient.GET("/teams/by-id/{id}/references", {
					params: { path: { id } },
				}),
			);
			return data;
		},
		enabled: id.length > 0,
		staleTime: 10_000,
	});
}

/** A team owns projects, and every project-owned row hangs off those; it also has an account. */
function invalidateTeamDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	for (const key of [["teams"], ["projects"], ["accounts"]]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
}

export function useTeams() {
	return useSuspenseQuery(teamsListQueryOptions);
}

export function useTeamsList(params: TeamsListParams) {
	return useSuspenseQuery(teamsListQuery(params));
}

export function useTeam(ref: string) {
	return useSuspenseQuery(teamDetailQueryOptions(ref));
}

export function useTeamReferences(id: string | undefined) {
	return useSuspenseQuery(teamReferencesQueryOptions(id ?? ""));
}

export function useCreateTeam() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: Team): Promise<Team> => {
			const data = unwrap(await apiClient.POST("/teams", { body }));
			return data;
		},
		onSuccess: () => {
			invalidateTeamDependents(queryClient);
		},
	});
}

export function useUpdateTeam() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: Team;
		}): Promise<Team> => {
			const data = unwrap(
				await apiClient.PUT("/teams/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
			return data;
		},
		onSuccess: () => {
			invalidateTeamDependents(queryClient);
		},
	});
}

/** Resolves to the links the delete took from rows that stay (empty on 204). */
export function useDeleteTeam() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<DetachedLinks[]> => {
			const data = unwrap(
				await apiClient.DELETE("/teams/by-id/{id}", {
					params: { path: { id } },
				}),
			);
			return data?.detached ?? [];
		},
		onSuccess: () => {
			invalidateTeamDependents(queryClient);
		},
	});
}
