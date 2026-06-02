import { useSuspenseQuery } from "@tanstack/react-query";
import { modelHostUsageQueryOptions } from "@/api/hooks/usage";

/** Recorded usage for one (model, host) pair over the summary window. */
export interface BindingUsage {
	/** Token sums by meter key (e.g. `prompt`, `completion`). */
	tokens: Record<string, number>;
	requests: number;
}

export interface ModelHostSpend {
	from: string;
	to: string;
	byHost: Map<string, BindingUsage>;
}

/**
 * One model's recorded usage, split by host. Lets the pricing tab multiply
 * real tokens by the per-host rates to estimate spend over the window.
 */
export function useModelHostSpend(modelId: string): ModelHostSpend {
	const { data } = useSuspenseQuery(modelHostUsageQueryOptions(modelId));
	const byHost = new Map<string, BindingUsage>();
	for (const row of data.rows ?? []) {
		const hostId = row.group?.host_id;
		if (!hostId) continue;
		byHost.set(hostId, { tokens: row.tokens ?? {}, requests: row.requests });
	}
	return { from: data.from, to: data.to, byHost };
}
