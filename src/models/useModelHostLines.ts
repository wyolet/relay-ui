import { useQuery } from "@tanstack/react-query";
import { type ModelHostLine, modelHostLines } from "@/lib/modelHostLines";
import { usageByGroup } from "@/lib/pricingMatrix";
import { useModelWeekQueries } from "@/models/modelWeekQueries";
import { useModelHosts } from "@/models/useModelHosts";
import { useModelPrices } from "@/pricing/useModelPrices";

export type { ModelHostLine };

/** The hosts serving the model with their rates and its last 7 days on
 * each. Prices and usage annotate the list and never hold it back. */
export function useModelHostLines(
	modelName: string,
	modelId: string | undefined,
): ModelHostLine[] {
	const rows = useModelHosts(modelName);
	const prices = useModelPrices();
	const { byHost } = useModelWeekQueries(modelId ?? "");
	const { data } = useQuery({ ...byHost, enabled: Boolean(modelId) });
	return modelHostLines(
		rows,
		modelId ? prices?.get(modelId) : undefined,
		prices !== undefined,
		data && usageByGroup(data.rows ?? [], "host_id"),
	);
}
