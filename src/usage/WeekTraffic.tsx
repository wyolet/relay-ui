import { Suspense, useState } from "react";
import { DelayedFallback } from "@/shared/DelayedFallback";
import { Section, SectionSkeleton } from "@/shared/Section";
import { Segmented } from "@/shared/Segmented";
import { StackedUsageChart } from "@/usage/StackedUsageChart";
import {
	useWeekTraffic,
	WEEK_TRAFFIC_METRICS,
	type WeekTrafficMetric,
	weekTrafficTitle,
} from "@/usage/useWeekTraffic";
import type { WeekUsageScope } from "@/usage/weekUsageQueries";

/** A resource's last 7 days split by `scope.splitBy`; nothing when it had no
 * traffic. */
export function WeekTraffic({ scope }: { scope: WeekUsageScope }) {
	return (
		<Suspense
			fallback={
				<DelayedFallback>
					<SectionSkeleton title={weekTrafficTitle(scope)} height="h-[280px]" />
				</DelayedFallback>
			}
		>
			<Traffic scope={scope} />
		</Suspense>
	);
}

function Traffic({ scope }: { scope: WeekUsageScope }) {
	const [metric, setMetric] = useState<WeekTrafficMetric>("requests");
	const { hasTraffic, data } = useWeekTraffic(scope, metric);
	if (!hasTraffic) return null;
	return (
		<Section
			title={weekTrafficTitle(scope)}
			meta="last 7 days"
			aside={
				<Segmented
					variant="underline"
					value={metric}
					onChange={setMetric}
					options={WEEK_TRAFFIC_METRICS}
				/>
			}
		>
			<StackedUsageChart
				data={data}
				groupBy={scope.splitBy}
				metric={metric}
				bare
			/>
		</Section>
	);
}
