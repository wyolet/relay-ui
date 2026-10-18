import { HeatLegend, HourHeatmap } from "@/shared/HourHeatmap";
import { Section } from "@/shared/Section";
import { useWeekActivity } from "./useWeekActivity";

/** When the relay is used: requests per hour of each day this week. */
export function WeekHeatmap() {
	const { rows, hours } = useWeekActivity();
	return (
		<Section
			title="Activity"
			meta="requests per hour, this week"
			aside={<HeatLegend />}
		>
			<HourHeatmap rows={rows} hours={hours} />
		</Section>
	);
}
