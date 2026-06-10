import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type {
	Pricing,
	PricingCreate,
	PricingListResponse,
	PricingUpdate,
} from "@/api/types/pricing";
import type { operations } from "@/api/types.gen";

// --- Query options ---

export type PricingsListParams = NonNullable<
	operations["list_pricings"]["parameters"]["query"]
>;

export const pricingsListQueryOptions = queryOptions({
	queryKey: ["pricings"] as const,
	queryFn: async (): Promise<PricingListResponse> => {
		const { data, error } = await apiClient.GET("/pricings");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

/** Filtered list driven by a table page's filter state (server-side). */
export function pricingsListQuery(params: PricingsListParams) {
	return queryOptions({
		queryKey: ["pricings", "list", params] as const,
		queryFn: async (): Promise<PricingListResponse> => {
			const { data, error } = await apiClient.GET("/pricings", {
				params: { query: params },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function pricingDetailQueryOptions(ref: string) {
	return queryOptions({
		queryKey: ["pricings", ref] as const,
		queryFn: async (): Promise<Pricing> => {
			const { data, error } = await apiClient.GET("/pricings/{ref}", {
				params: { path: { ref } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

// --- Hooks ---

export function usePricings() {
	return useSuspenseQuery(pricingsListQueryOptions);
}

export function usePricingsList(params: PricingsListParams) {
	return useSuspenseQuery(pricingsListQuery(params));
}

export function usePricing(ref: string) {
	return useSuspenseQuery(pricingDetailQueryOptions(ref));
}

/**
 * Pricing edits change what binding rows report (PricingView is embedded in
 * /models/{ref}/hosts and /hosts/{ref}/models) and therefore every cost
 * figure — invalidate those domains alongside the pricing list.
 */
function invalidatePricingDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	void queryClient.invalidateQueries({ queryKey: ["pricings"] });
	void queryClient.invalidateQueries({ queryKey: ["models"] });
	void queryClient.invalidateQueries({ queryKey: ["hosts"] });
}

export function useCreatePricing() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: PricingCreate): Promise<Pricing> => {
			const { data, error } = await apiClient.POST("/pricings", { body });
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onMutate: async (newPricing) => {
			await queryClient.cancelQueries({ queryKey: ["pricings"] });
			const previous = queryClient.getQueryData(
				pricingsListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				pricingsListQueryOptions.queryKey,
				(old: PricingListResponse | undefined) => {
					if (!old) return old;
					const optimistic: Pricing = {
						metadata: { name: newPricing.metadata.name },
						spec: { ...newPricing.spec },
					};
					return {
						...old,
						items: [...(old.items ?? []), optimistic],
						total: old.total + 1,
					};
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					pricingsListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			invalidatePricingDependents(queryClient);
		},
	});
}

export function useUpdatePricing(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: PricingUpdate): Promise<Pricing> => {
			const { data, error } = await apiClient.PUT("/pricings/by-id/{id}", {
				params: { path: { id } },
				body,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			invalidatePricingDependents(queryClient);
		},
	});
}

export function useDeletePricing() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			const { error } = await apiClient.DELETE("/pricings/by-id/{id}", {
				params: { path: { id } },
			});
			if (error) throw new ApiError(0, error.error);
		},
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["pricings"] });
			const previous = queryClient.getQueryData(
				pricingsListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				pricingsListQueryOptions.queryKey,
				(old: PricingListResponse | undefined) => {
					if (!old) return old;
					return {
						items: (old.items ?? []).filter((p) => p.metadata.id !== id),
						total: old.total,
					};
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					pricingsListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			invalidatePricingDependents(queryClient);
		},
	});
}
