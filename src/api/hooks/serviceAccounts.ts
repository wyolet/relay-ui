import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type {
	ServiceAccount,
	ServiceAccountList,
} from "@/api/types/serviceAccount";
import type { operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

/** Server-side filter/sort/page params accepted by GET /service-accounts. */
export type ServiceAccountsListParams = NonNullable<
	operations["list_service-accounts"]["parameters"]["query"]
>;

export const serviceAccountsListQueryOptions = queryOptions({
	queryKey: ["service-accounts"] as const,
	queryFn: async (): Promise<ServiceAccountList> => {
		const data = unwrap(await apiClient.GET("/service-accounts"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function serviceAccountsListQuery(params: ServiceAccountsListParams) {
	return queryOptions({
		queryKey: ["service-accounts", "list", params] as const,
		queryFn: async (): Promise<ServiceAccountList> => {
			const data = unwrap(
				await apiClient.GET("/service-accounts", { params: { query: params } }),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function serviceAccountDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["service-accounts", ref] as const,
		queryFn: async (): Promise<ServiceAccount> => {
			const data = unwrap(
				await apiClient.GET("/service-accounts/{ref}", {
					params: { path: { ref } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function serviceAccountReferencesQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["service-accounts", "references", id] as const,
		queryFn: async () => {
			const data = unwrap(
				await apiClient.GET("/service-accounts/by-id/{id}/references", {
					params: { path: { id } },
				}),
			);
			return data;
		},
		enabled: id.length > 0,
		staleTime: 10_000,
	});
}

/** A service account owns keys and points at a project and a policy. */
function invalidateServiceAccountDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	for (const key of [["service-accounts"], ["keys"], ["projects"]]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
}

export function useServiceAccounts() {
	return useSuspenseQuery(serviceAccountsListQueryOptions);
}

export function useServiceAccountsList(params: ServiceAccountsListParams) {
	return useSuspenseQuery(serviceAccountsListQuery(params));
}

/** The accounts of one project, server-filtered. Non-suspending so a picker
 * can switch projects without tearing down the form. */
export function useServiceAccountsInProject(projectId: string) {
	return useQuery({
		...serviceAccountsListQuery({ project_id: [projectId] }),
		enabled: projectId.length > 0,
	});
}

export function useServiceAccount(ref: string) {
	return useSuspenseQuery(serviceAccountDetailQueryOptions(ref));
}

export function useServiceAccountReferences(id: string | undefined) {
	return useSuspenseQuery(serviceAccountReferencesQueryOptions(id ?? ""));
}

export function useCreateServiceAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: ServiceAccount): Promise<ServiceAccount> => {
			const data = unwrap(await apiClient.POST("/service-accounts", { body }));
			return data;
		},
		onSuccess: () => {
			invalidateServiceAccountDependents(queryClient);
		},
	});
}

export function useUpdateServiceAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: ServiceAccount;
		}): Promise<ServiceAccount> => {
			const data = unwrap(
				await apiClient.PUT("/service-accounts/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
			return data;
		},
		onSuccess: () => {
			invalidateServiceAccountDependents(queryClient);
		},
	});
}

export function useDeleteServiceAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.DELETE("/service-accounts/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onSuccess: () => {
			invalidateServiceAccountDependents(queryClient);
		},
	});
}
