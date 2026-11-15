import type { WeekUsageScope } from "@/usage/weekUsageQueries";

/** The host's week of usage, its traffic split by model. */
export function hostWeekScope(hostId: string): WeekUsageScope {
	return { filter: { host_id: [hostId] }, splitBy: "model_id" };
}

export const HOST_NO_TRAFFIC =
	"Requests routed through this host show up here: spend, latency, errors and the models they called.";
