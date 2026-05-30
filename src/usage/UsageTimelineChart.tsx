import { type UsageInterval, useUsageTimeline } from "@/api/hooks/usage";
import { RequestsAreaChart } from "./RequestsAreaChart";

/** Aggregate requests-over-time with an errors overlay (Usage page). */
export function UsageTimelineChart({ interval }: { interval: UsageInterval }) {
	const { from, to, points } = useUsageTimeline(interval);
	return (
		<RequestsAreaChart
			points={points}
			from={from}
			to={to}
			interval={interval}
		/>
	);
}
