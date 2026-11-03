import {
	queryOptions,
	useMutation,
	useQuery,
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
export type MyAccount = components["schemas"]["MyAccount"];
export type AccountLimits = components["schemas"]["AccountLimits"];
export type AccountShares = components["schemas"]["AccountShares"];
export type AccountShare = components["schemas"]["AccountShare"];
export type AccountShareParty = components["schemas"]["AccountShareParty"];
export type AccountReceiver = components["schemas"]["AccountReceiver"];
export type UpstreamKeys = components["schemas"]["upstreamKeysOutBody"];
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
	for (const key of [
		["accounts"],
		["host-keys"],
		["policy-bindings"],
		["pools"],
	]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
}

export function useAccounts() {
	return useSuspenseQuery(accountListQueryOptions);
}

export function useAccountsList(params: AccountsListParams) {
	return useSuspenseQuery(accountListQuery(params));
}

/** What a row owned by `usableBy` may link: a binding's accounts, or a pool's. */
export type AccountUse = NonNullable<AccountsListParams["usable_for"]>;

/** The accounts a `use` row owned by `usableBy` may link, narrowed by `params`. */
export function usableAccountsQuery(
	usableBy: string | undefined,
	params: AccountsListParams,
	use: AccountUse,
) {
	return accountListQuery({
		...params,
		usable_by: usableBy,
		...(usableBy ? { usable_for: use } : {}),
	});
}

/** The accounts a binding owned by `usableBy` may link, suspending until the list loads. */
export function useUsableAccountsSuspense(
	usableBy: string | undefined,
	params: AccountsListParams = {},
): Account[] {
	const { data } = useSuspenseQuery(
		usableAccountsQuery(usableBy, params, "binding"),
	);
	return data.items ?? [];
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

/** The signed-in user's accounts; empty for the admin token. */
export const myAccountsQueryOptions = queryOptions({
	queryKey: ["accounts", "me", "list"] as const,
	queryFn: async (): Promise<MyAccount[]> =>
		unwrap(await apiClient.GET("/me/accounts")) ?? [],
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function useMyAccounts() {
	return useSuspenseQuery(myAccountsQueryOptions);
}

/** The rungs a request in the account climbs, with usage against each limit. */
export function accountLimitsQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["accounts", ref, "limits"] as const,
		queryFn: async (): Promise<AccountLimits> =>
			unwrap(
				await apiClient.GET("/accounts/{ref}/limits", {
					params: { path: { ref } },
				}),
			),
		retry: false,
		staleTime: 10_000,
		gcTime: 5 * 60_000,
	});
}

export function useAccountLimits(ref: string, enabled: boolean) {
	return useQuery({ ...accountLimitsQueryOptions(ref), enabled });
}

/** The account's keys, secret-free; a shared account lists its real account's, marked readOnly. */
export function accountKeysQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["accounts", ref, "keys"] as const,
		queryFn: async (): Promise<UpstreamKeys> =>
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

/** The accounts a provider account is shared with, with usage over the server's default window (30 days). */
export function accountSharesQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["accounts", ref, "shares"] as const,
		queryFn: async (): Promise<AccountShares> =>
			unwrap(
				await apiClient.GET("/accounts/{ref}/shares", {
					params: { path: { ref } },
				}),
			),
		retry: false,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function useAccountShares(ref: string, enabled: boolean) {
	return useQuery({ ...accountSharesQueryOptions(ref), enabled });
}

/** Resolves to the shared account the receiver now owns. */
export function useShareAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			ref,
			receiver,
		}: {
			ref: string;
			receiver: AccountReceiver;
		}): Promise<Account> =>
			unwrap(
				await apiClient.POST("/accounts/{ref}/shares", {
					params: { path: { ref } },
					body: { receiver },
				}),
			),
		onSuccess: () => invalidateAccountDependents(queryClient),
	});
}
