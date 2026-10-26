import { useSuspenseQuery } from "@tanstack/react-query";
import type { Pricing } from "@/api/types/pricing";
import { pricingGraphQuery } from "./usePricingMatrix";
import { useTargetModelOptions } from "./useTargetModelOptions";

/** The sheet's target models, labelled, and whether its host serves each:
 * a target without a binding prices nothing. */
export function usePricingTargets(pricing: Pricing) {
	const { data: graph } = useSuspenseQuery(pricingGraphQuery);
	const options = useTargetModelOptions();
	const hostId = pricing.metadata.owner?.id;
	const served = new Set(
		(graph.models ?? [])
			.filter((m) => m.bindings?.some((b) => b.hostId === hostId))
			.map((m) => m.id),
	);
	const byId = new Map(options.map((o) => [o.id, o]));
	return (pricing.spec.targetModels ?? [])
		.map((id) => {
			const option = byId.get(id);
			return {
				id,
				label: option?.label ?? id,
				slug: option?.slug ?? id,
				served: served.has(id),
			};
		})
		.sort((a, b) => a.label.localeCompare(b.label));
}
