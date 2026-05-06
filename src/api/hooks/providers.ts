import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { adminDelete, adminGet, adminPost, adminPut } from "#/api/fetch";
import type {
	Provider,
	ProviderCreate,
	ProvidersListResponse,
	ProviderUpdate,
} from "#/api/types/provider";

// --- Query options ---

export const providersListQueryOptions = queryOptions({
	queryKey: ["providers"] as const,
	queryFn: () => adminGet<ProvidersListResponse>("/admin/providers"),
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function providerDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["providers", name] as const,
		queryFn: () =>
			adminGet<Provider>(`/admin/providers/${encodeURIComponent(name)}`),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

// --- Hooks ---

export function useProviders() {
	return useSuspenseQuery(providersListQueryOptions);
}

export function useProvider(name: string) {
	return useSuspenseQuery(providerDetailQueryOptions(name));
}

export function useCreateProvider() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: ProviderCreate) =>
			adminPost<Provider>("/admin/providers", data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["providers"] });
		},
		onMutate: async (newProvider) => {
			await queryClient.cancelQueries({ queryKey: ["providers"] });
			const previous = queryClient.getQueryData(
				providersListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				providersListQueryOptions.queryKey,
				(old: ProvidersListResponse | undefined) => {
					if (!old) return old;
					const optimistic: Provider = {
						name: newProvider.name,
						kind: newProvider.kind,
						endpoint: newProvider.endpoint,
						secret: newProvider.secret,
					};
					return { items: [...old.items, optimistic] };
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					providersListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
	});
}

export function useUpdateProvider(name: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: ProviderUpdate) =>
			adminPut<Provider>(`/admin/providers/${encodeURIComponent(name)}`, data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["providers"] });
		},
	});
}

export function useDeleteProvider() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (name: string) =>
			adminDelete(`/admin/providers/${encodeURIComponent(name)}`),
		onMutate: async (name) => {
			await queryClient.cancelQueries({ queryKey: ["providers"] });
			const previous = queryClient.getQueryData(
				providersListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				providersListQueryOptions.queryKey,
				(old: ProvidersListResponse | undefined) => {
					if (!old) return old;
					return { items: old.items.filter((p) => p.name !== name) };
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					providersListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["providers"] });
		},
	});
}
