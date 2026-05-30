import { type ResourceUsageStats, useResourceUsage } from "@/api/hooks/usage";

/** Real per-host usage totals for the Overview cards. */
export function useHostUsage(hostId: string): ResourceUsageStats | null {
	return useResourceUsage("host_id", hostId);
}
