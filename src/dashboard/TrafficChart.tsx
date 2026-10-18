import { Section } from "@/shared/Section";
import { Segmented } from "@/shared/Segmented";
import { useDashboardStore } from "@/stores/dashboard";
import { StackedUsageChart } from "@/usage/StackedUsageChart";
import {
	DASHBOARD_METRICS,
	useDashboardWindow,
	useMetricSeries,
} from "./useDashboardWindow";

/** The period by model, as spend or tokens. */
export function TrafficChart() {
	const metric = useDashboardStore((s) => s.chartMetric);
	const setMetric = useDashboardStore((s) => s.setChartMetric);
	const { period, win } = useDashboardWindow();
	const data = useMetricSeries(metric, win);
	return (
		<Section
			title="Traffic by model"
			meta={period}
			aside={
				<Segmented
					variant="underline"
					value={metric}
					onChange={setMetric}
					options={DASHBOARD_METRICS}
				/>
			}
		>
			<StackedUsageChart
				data={data}
				groupBy="model_id"
				metric={metric}
				bare
				height="h-[260px]"
			/>
		</Section>
	);
}
