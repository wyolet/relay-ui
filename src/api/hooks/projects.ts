import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { Project, ProjectList } from "@/api/types/project";
import type { operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

/** Server-side filter/sort/page params accepted by GET /projects. */
export type ProjectsListParams = NonNullable<
	operations["list_projects"]["parameters"]["query"]
>;

export const projectsListQueryOptions = queryOptions({
	queryKey: ["projects"] as const,
	queryFn: async (): Promise<ProjectList> => {
		const data = unwrap(await apiClient.GET("/projects"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function projectsListQuery(params: ProjectsListParams) {
	return queryOptions({
		queryKey: ["projects", "list", params] as const,
		queryFn: async (): Promise<ProjectList> => {
			const data = unwrap(
				await apiClient.GET("/projects", { params: { query: params } }),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function projectDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["projects", ref] as const,
		queryFn: async (): Promise<Project> => {
			const data = unwrap(
				await apiClient.GET("/projects/{ref}", { params: { path: { ref } } }),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function projectReferencesQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["projects", "references", id] as const,
		queryFn: async () => {
			const data = unwrap(
				await apiClient.GET("/projects/by-id/{id}/references", {
					params: { path: { id } },
				}),
			);
			return data;
		},
		enabled: id.length > 0,
		staleTime: 10_000,
	});
}

/** A project owns service accounts, and their keys hang off those. */
function invalidateProjectDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	for (const key of [["projects"], ["service-accounts"], ["keys"]]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
}

export function useProjects() {
	return useSuspenseQuery(projectsListQueryOptions);
}

export function useProjectsList(params: ProjectsListParams) {
	return useSuspenseQuery(projectsListQuery(params));
}

export function useProject(ref: string) {
	return useSuspenseQuery(projectDetailQueryOptions(ref));
}

export function useProjectReferences(id: string | undefined) {
	return useSuspenseQuery(projectReferencesQueryOptions(id ?? ""));
}

/** The projects of one team, server-filtered. Non-suspending so the team
 * page keeps its shell while the list loads. */
export function useProjectsInTeam(teamId: string) {
	return useQuery({
		...projectsListQuery({ team_id: [teamId] }),
		enabled: teamId.length > 0,
	});
}

export function useCreateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: Project): Promise<Project> => {
			const data = unwrap(await apiClient.POST("/projects", { body }));
			return data;
		},
		onSuccess: () => {
			invalidateProjectDependents(queryClient);
		},
	});
}

export function useUpdateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: Project;
		}): Promise<Project> => {
			const data = unwrap(
				await apiClient.PUT("/projects/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
			return data;
		},
		onSuccess: () => {
			invalidateProjectDependents(queryClient);
		},
	});
}

export function useDeleteProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.DELETE("/projects/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onSuccess: () => {
			invalidateProjectDependents(queryClient);
		},
	});
}
