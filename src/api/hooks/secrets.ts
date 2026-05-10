import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type {
	SecretCreate,
	SecretListResponse,
	SecretResponse,
	SecretUpdate,
} from "@/api/types/secret";

// --- Query options ---

export const secretsListQueryOptions = queryOptions({
	queryKey: ["secrets"] as const,
	queryFn: async (): Promise<SecretListResponse> => {
		const { data, error } = await apiClient.GET("/control/secrets");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function secretDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["secrets", name] as const,
		queryFn: async (): Promise<SecretResponse> => {
			const { data, error } = await apiClient.GET("/control/secrets/{name}", {
				params: { path: { name } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
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
		mutationFn: async (body: SecretCreate): Promise<SecretResponse> => {
			const { data, error } = await apiClient.POST("/control/secrets", {
				body,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["secrets"] });
		},
	});
}

export function useUpdateSecret(name: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: SecretUpdate): Promise<SecretResponse> => {
			const { data, error } = await apiClient.PUT("/control/secrets/{name}", {
				params: { path: { name } },
				body,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["secrets"] });
		},
	});
}

export function useDeleteSecret() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (name: string): Promise<void> => {
			const { error } = await apiClient.DELETE("/control/secrets/{name}", {
				params: { path: { name } },
			});
			if (error) throw new ApiError(0, error.error);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["secrets"] });
		},
	});
}
