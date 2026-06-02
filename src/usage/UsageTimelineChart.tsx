import {
	DEFAULT_WINDOW,
	type UsageInterval,
	useUsageTimeline,
} from "@/api/hooks/usage";
import { RequestsAreaChart } from "./RequestsAreaChart";

/** Aggregate requests-over-time with an errors overlay (Usage page). */
export function UsageTimelineChart({
	interval,
	since = DEFAULT_WINDOW[interval],
}: {
	interval: UsageInterval;
	since?: string;
}) {
	const { from, to, points } = useUsageTimeline(interval, since);
	return (
		<RequestsAreaChart
			points={points}
			from={from}
			to={to}
			interval={interval}
		/>
	);
}
