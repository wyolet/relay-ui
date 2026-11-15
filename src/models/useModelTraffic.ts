import { useCostSeries } from "@/api/hooks/cost";
import {
	type StackedTimeline,
	useHasTraffic,
	useStackedSeries,
} from "@/api/hooks/usage";
import { useModelWeekQueries } from "@/models/modelWeekQueries";
import type { SegmentedOption } from "@/shared/Segmented";

export type ModelTrafficMetric = "requests" | "cost";

export const MODEL_TRAFFIC_METRICS: SegmentedOption<ModelTrafficMetric>[] = [
	{ value: "requests", label: "Requests" },
	{ value: "cost", label: "Spend" },
];

/** The model's last 7 days by host, as requests or spend; both read the one
 * timeseries the figures' trends come from. */
export function useModelTraffic(
	modelId: string,
	metric: ModelTrafficMetric,
): { hasTraffic: boolean; data: StackedTimeline } {
	const { win, filter } = useModelWeekQueries(modelId);
	const hasTraffic = useHasTraffic(win, filter);
	const requests = useStackedSeries("host_id", win, "requests", filter);
	const cost = useCostSeries("host_id", win, filter);
	return { hasTraffic, data: metric === "cost" ? cost : requests };
}
