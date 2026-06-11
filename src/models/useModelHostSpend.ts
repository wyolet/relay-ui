import { useSuspenseQuery } from "@tanstack/react-query";
import { modelHostUsageQueryOptions } from "@/api/hooks/usage";
import { type CostTotal, costTotal } from "@/lib/usage-math/cost";

/** Recorded usage for one (model, host) pair over the summary window. */
export interface BindingUsage {
	requests: number;
	/** Server-stamped spend for the pair (see lib/usage-math/cost). */
	cost: CostTotal;
}

export interface ModelHostSpend {
	from: string;
	to: string;
	byHost: Map<string, BindingUsage>;
}

/**
 * One model's recorded usage, split by host. Feeds the pricing tab's
 * per-host spend figures, read straight off the summary rows' cost fields.
 */
export function useModelHostSpend(modelId: string): ModelHostSpend {
	const { data } = useSuspenseQuery(modelHostUsageQueryOptions(modelId));
	const byHost = new Map<string, BindingUsage>();
	for (const row of data.rows ?? []) {
		const hostId = row.group?.host_id;
		if (!hostId) continue;
		byHost.set(hostId, {
			requests: row.requests,
			cost: costTotal(row.cost_nanos, row.unpriced, row.requests),
		});
	}
	return { from: data.from, to: data.to, byHost };
}
