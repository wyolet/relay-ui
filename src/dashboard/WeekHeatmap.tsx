import { HeatLegend, HourHeatmap } from "@/shared/HourHeatmap";
import { Section } from "@/shared/Section";
import { Segmented } from "@/shared/Segmented";
import { useDashboardStore } from "@/stores/dashboard";
import { DASHBOARD_METRICS, useDashboardWindow } from "./useDashboardWindow";
import { useWeekActivity } from "./useWeekActivity";

/** When the relay is used: spend or tokens per hour across the period. */
export function WeekHeatmap() {
	const metric = useDashboardStore((s) => s.heatmapMetric);
	const setMetric = useDashboardStore((s) => s.setHeatmapMetric);
	const { period, range } = useDashboardWindow();
	const { rows, hours } = useWeekActivity(metric);
	return (
		<Section
			title="Activity"
			meta={`per hour${range === "month" ? " by weekday" : ""}, ${period}`}
			aside={
				<div className="flex items-center gap-5">
					<HeatLegend />
					<Segmented
						variant="underline"
						value={metric}
						onChange={setMetric}
						options={DASHBOARD_METRICS}
					/>
				</div>
			}
		>
			<HourHeatmap rows={rows} hours={hours} />
		</Section>
	);
}
