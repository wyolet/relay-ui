import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { adminDelete, adminGet, adminPost, adminPut } from "#/api/fetch";
import type {
	Model,
	ModelCreate,
	ModelsListResponse,
	ModelUpdate,
} from "#/api/types/model";

// --- Query options ---

export const modelsListQueryOptions = queryOptions({
	queryKey: ["models"] as const,
	queryFn: () => adminGet<ModelsListResponse>("/admin/models"),
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function modelDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["models", name] as const,
		queryFn: () => adminGet<Model>(`/admin/models/${encodeURIComponent(name)}`),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

// --- Hooks ---

export function useModels() {
	return useSuspenseQuery(modelsListQueryOptions);
}

export function useModel(name: string) {
	return useSuspenseQuery(modelDetailQueryOptions(name));
}

export function useCreateModel() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: ModelCreate) => adminPost<Model>("/admin/models", data),
		onMutate: async (newModel) => {
			await queryClient.cancelQueries({ queryKey: ["models"] });
			const previous = queryClient.getQueryData(
				modelsListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				modelsListQueryOptions.queryKey,
				(old: ModelsListResponse | undefined) => {
					if (!old) return old;
					const optimistic: Model = {
						name: newModel.name,
						provider: newModel.provider,
						upstream_name: newModel.upstream_name,
						capabilities: newModel.capabilities,
						pricing: newModel.pricing,
					};
					return { items: [...old.items, optimistic] };
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					modelsListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["models"] });
		},
	});
}

export function useUpdateModel(name: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: ModelUpdate) =>
			adminPut<Model>(`/admin/models/${encodeURIComponent(name)}`, data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["models"] });
		},
	});
}

export function useDeleteModel() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (name: string) =>
			adminDelete(`/admin/models/${encodeURIComponent(name)}`),
		onMutate: async (name) => {
			await queryClient.cancelQueries({ queryKey: ["models"] });
			const previous = queryClient.getQueryData(
				modelsListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				modelsListQueryOptions.queryKey,
				(old: ModelsListResponse | undefined) => {
					if (!old) return old;
					return { items: old.items.filter((m) => m.name !== name) };
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					modelsListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["models"] });
		},
	});
}
