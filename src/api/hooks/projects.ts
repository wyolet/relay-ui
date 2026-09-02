import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { Project, ProjectList } from "@/api/types/project";
import { unwrap } from "@/api/unwrap";

export const projectsListQueryOptions = queryOptions({
	queryKey: ["projects"] as const,
	queryFn: async (): Promise<ProjectList> => {
		const data = unwrap(await apiClient.GET("/projects"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

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

export function useProjects() {
	return useSuspenseQuery(projectsListQueryOptions);
}
