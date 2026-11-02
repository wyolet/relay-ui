import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { DetachedLinks } from "@/api/types/errors";
import type { components, operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

export type Account = components["schemas"]["Account"];
export type AccountSpec = components["schemas"]["AccountSpec"];
export type AccountList = components["schemas"]["AccountList"];
/** Server-side filter/sort/page params accepted by GET /accounts. */
export type AccountsListParams = NonNullable<
	operations["list_accounts"]["parameters"]["query"]
>;

export const accountListQueryOptions = queryOptions({
	queryKey: ["accounts"] as const,
	queryFn: async (): Promise<AccountList> =>
		unwrap(await apiClient.GET("/accounts")),
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function accountListQuery(params: AccountsListParams) {
	return queryOptions({
		queryKey: ["accounts", "list", params] as const,
		queryFn: async (): Promise<AccountList> =>
			unwrap(await apiClient.GET("/accounts", { params: { query: params } })),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function accountDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["accounts", ref] as const,
		queryFn: async (): Promise<Account> =>
			unwrap(
				await apiClient.GET("/accounts/{ref}", { params: { path: { ref } } }),
			),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function accountReferencesQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["accounts", "references", id] as const,
		queryFn: async () =>
			unwrap(
				await apiClient.GET("/accounts/by-id/{id}/references", {
					params: { path: { id } },
				}),
			),
		enabled: id.length > 0,
		staleTime: 10_000,
	});
}

function invalidateAccountDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	for (const key of [["accounts"], ["host-keys"], ["policy-bindings"]]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
}

export function useAccounts() {
	return useSuspenseQuery(accountListQueryOptions);
}

export function useAccountsList(params: AccountsListParams) {
	return useSuspenseQuery(accountListQuery(params));
}

export function useAccount(ref: string) {
	return useSuspenseQuery(accountDetailQueryOptions(ref));
}

export function useAccountReferences(id: string | undefined) {
	return useSuspenseQuery(accountReferencesQueryOptions(id ?? ""));
}

export function useCreateAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: Account): Promise<Account> =>
			unwrap(await apiClient.POST("/accounts", { body })),
		onSuccess: () => invalidateAccountDependents(queryClient),
	});
}

export function useUpdateAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: Account;
		}): Promise<Account> =>
			unwrap(
				await apiClient.PUT("/accounts/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			),
		onSuccess: () => invalidateAccountDependents(queryClient),
	});
}

/** Resolves to the links the delete took from rows that stay (empty on 204). */
export function useDeleteAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<DetachedLinks[]> => {
			const data = unwrap(
				await apiClient.DELETE("/accounts/by-id/{id}", {
					params: { path: { id } },
				}),
			);
			return data?.detached ?? [];
		},
		onSuccess: () => invalidateAccountDependents(queryClient),
	});
}

/** The account's host keys, secret-free. */
export function accountKeysQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["accounts", ref, "keys"] as const,
		queryFn: async () =>
			unwrap(
				await apiClient.GET("/accounts/{ref}/keys", {
					params: { path: { ref } },
				}),
			),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function useAccountKeys(ref: string) {
	return useSuspenseQuery(accountKeysQueryOptions(ref));
}
