import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import {
	type ModelPriceSummary,
	modelPriceSummaries,
} from "@/lib/pricingMatrix";
import {
	matrixFromLists,
	pricingGraphQuery,
	pricingsMatrixListQuery,
} from "@/pricing/usePricingMatrix";

export type ModelPrices = ReadonlyMap<string, ModelPriceSummary>;

/** Every served model's per-host prices, keyed by model id; undefined until
 * the lists load. Not suspending: a price is an annotation, never a gate. */
export function useModelPrices(): ModelPrices | undefined {
	const { data: graph } = useQuery(pricingGraphQuery);
	const { data: hosts } = useQuery(hostsListQueryOptions);
	const { data: models } = useQuery(modelsListQueryOptions);
	const { data: pricings } = useQuery(pricingsMatrixListQuery);
	// One build per list change, shared by every row that reads it.
	return useMemo(
		() =>
			graph && hosts && models && pricings
				? modelPriceSummaries(
						matrixFromLists({ graph, hosts, models, pricings }),
					)
				: undefined,
		[graph, hosts, models, pricings],
	);
}
