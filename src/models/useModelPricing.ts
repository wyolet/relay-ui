import { type Pricing, useModelPricingRecords } from "@/api/hooks/pricings";

/** Pricing records configured for this model (empty when none). */
export function useModelPricing(modelId: string): Pricing[] {
	return useModelPricingRecords(modelId);
}
