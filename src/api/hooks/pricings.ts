import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";

// --- Schema-derived types ---

export type Pricing = components["schemas"]["Pricing"];
export type PricingRate = components["schemas"]["PricingRate"];
export type PricingList = components["schemas"]["PricingList"];

// --- Query options ---

/** Pricing records targeting a given model id. */
export function modelPricingQueryOptions(modelId: string) {
	return queryOptions({
		queryKey: ["pricings", "model", modelId] as const,
		queryFn: async (): Promise<PricingList> => {
			const { data, error } = await apiClient.GET("/pricings", {
				params: { query: { target_model_id: [modelId] } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 60_000,
		gcTime: 5 * 60_000,
	});
}

export function useModelPricingRecords(modelId: string): Pricing[] {
	const { data } = useSuspenseQuery(modelPricingQueryOptions(modelId));
	return data.items ?? [];
}
