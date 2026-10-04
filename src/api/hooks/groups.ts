import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { Group, GroupList } from "@/api/types/group";
import type { operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

/** Server-side filter/sort/page params accepted by GET /groups. */
export type GroupsListParams = NonNullable<
	operations["list_groups"]["parameters"]["query"]
>;

export const groupsListQueryOptions = queryOptions({
	queryKey: ["groups"] as const,
	queryFn: async (): Promise<GroupList> => {
		const data = unwrap(await apiClient.GET("/groups"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function groupsListQuery(params: GroupsListParams) {
	return queryOptions({
		queryKey: ["groups", "list", params] as const,
		queryFn: async (): Promise<GroupList> => {
			const data = unwrap(
				await apiClient.GET("/groups", { params: { query: params } }),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function groupDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["groups", ref] as const,
		queryFn: async (): Promise<Group> => {
			const data = unwrap(
				await apiClient.GET("/groups/{ref}", { params: { path: { ref } } }),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function useGroups() {
	return useSuspenseQuery(groupsListQueryOptions);
}

export function useGroupsList(params: GroupsListParams) {
	return useSuspenseQuery(groupsListQuery(params));
}

export function useGroup(ref: string) {
	return useSuspenseQuery(groupDetailQueryOptions(ref));
}

export function useCreateGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: Group): Promise<Group> => {
			const data = unwrap(await apiClient.POST("/groups", { body }));
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["groups"] });
		},
	});
}

export function useUpdateGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: Group;
		}): Promise<Group> => {
			const data = unwrap(
				await apiClient.PUT("/groups/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["groups"] });
		},
	});
}

export function useDeleteGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.DELETE("/groups/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["groups"] });
		},
	});
}
