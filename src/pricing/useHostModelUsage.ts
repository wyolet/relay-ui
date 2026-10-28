import { useQueries } from "@tanstack/react-query";
import { usageSummaryQueryOptions, useUsageNow } from "@/api/hooks/usage";
import { type ModelUsage, usageByModel } from "@/lib/pricingMatrix";
import { rollingWindow } from "@/lib/usage-math/window";

/** The trailing week pricing pages measure traffic over. */
export function usePricingWindow() {
	return { ...rollingWindow(useUsageNow(), 7 * 24), interval: "1h" as const };
}

/** Last week's requests and spend per model on each host, keyed by host id.
 * Not suspending: a host whose usage hasn't loaded (or failed) is absent. */
export function useHostModelUsage(
	hostIds: readonly string[],
): Map<string, Map<string, ModelUsage>> {
	const win = usePricingWindow();
	const results = useQueries({
		queries: hostIds.map((id) =>
			usageSummaryQueryOptions("model_id", win, { host_id: [id] }),
		),
	});
	const out = new Map<string, Map<string, ModelUsage>>();
	results.forEach((r, i) => {
		const id = hostIds[i];
		if (id && r.data) out.set(id, usageByModel(r.data.rows ?? []));
	});
	return out;
}
