import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type {
	Model,
	ModelCreate,
	ModelListResponse,
	ModelUpdate,
} from "@/api/types/model";

// --- Query options ---

export const modelsListQueryOptions = queryOptions({
	queryKey: ["models"] as const,
	queryFn: async (): Promise<ModelListResponse> => {
		const { data, error } = await apiClient.GET("/models");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function modelDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["models", name] as const,
		queryFn: async (): Promise<Model> => {
			const { data, error } = await apiClient.GET("/models/{ref}", {
				params: { path: { ref: name } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
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
		mutationFn: async (body: ModelCreate): Promise<Model> => {
			const { data, error } = await apiClient.POST("/models", { body });
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onMutate: async (newModel) => {
			await queryClient.cancelQueries({ queryKey: ["models"] });
			const previous = queryClient.getQueryData(
				modelsListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				modelsListQueryOptions.queryKey,
				(old: ModelListResponse | undefined) => {
					if (!old) return old;
					const optimistic: Model = {
						metadata: { name: newModel.metadata.name },
						spec: { ...newModel.spec },
					};
					return { items: [...(old.items ?? []), optimistic] };
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

export function useUpdateModel(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: ModelUpdate): Promise<Model> => {
			const { data, error } = await apiClient.PUT(
				"/models/by-id/{id}",
				{
					params: { path: { id } },
					body,
				},
			);
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["models"] });
		},
	});
}

