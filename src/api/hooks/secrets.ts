import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { adminDelete, adminGet, adminPost, adminPut } from "#/api/fetch";
import type {
	Secret,
	SecretCreate,
	SecretsListResponse,
	SecretUpdate,
} from "#/api/types/secret";

// --- Query options ---

export const secretsListQueryOptions = queryOptions({
	queryKey: ["secrets"] as const,
	queryFn: () => adminGet<SecretsListResponse>("/admin/secrets"),
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function secretDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["secrets", name] as const,
		queryFn: () =>
			adminGet<Secret>(`/admin/secrets/${encodeURIComponent(name)}`),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

// --- Hooks ---

export function useSecrets() {
	return useSuspenseQuery(secretsListQueryOptions);
}

export function useSecret(name: string) {
	return useSuspenseQuery(secretDetailQueryOptions(name));
}

export function useCreateSecret() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: SecretCreate) =>
			adminPost<Secret>("/admin/secrets", data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["secrets"] });
		},
	});
}

export function useUpdateSecret(name: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: SecretUpdate) =>
			adminPut<Secret>(`/admin/secrets/${encodeURIComponent(name)}`, data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["secrets"] });
		},
	});
}

export function useDeleteSecret() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (name: string) =>
			adminDelete(`/admin/secrets/${encodeURIComponent(name)}`),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["secrets"] });
		},
	});
}
