import type { components } from "@/api/types.gen";

export type Pricing = components["schemas"]["Pricing"];
export type PricingSpec = components["schemas"]["PricingSpec"];
export type PricingRate = components["schemas"]["PricingRate"];
export type PricingListResponse = components["schemas"]["PricingList"];
/** Compact read-only pricing as embedded in binding rows (model↔host views). */
export type PricingView = components["schemas"]["PricingView"];

export type PricingCreate = components["schemas"]["Pricing"];
export type PricingUpdate = components["schemas"]["Pricing"];
