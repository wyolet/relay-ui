import { type ResourceUsageStats, useResourceUsage } from "@/api/hooks/usage";

/** Real per-model usage totals for the Overview cards. */
export function useModelUsage(modelId: string): ResourceUsageStats | null {
	return useResourceUsage("model_id", modelId);
}
