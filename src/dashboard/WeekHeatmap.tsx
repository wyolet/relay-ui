import { useState } from "react";
import { HeatLegend, HourHeatmap } from "@/shared/HourHeatmap";
import { Section } from "@/shared/Section";
import { Segmented, type SegmentedOption } from "@/shared/Segmented";
import { type CellSize, useWeekActivity } from "./useWeekActivity";

const CELL_OPTIONS: SegmentedOption<CellSize>[] = [
	{ value: "1h", label: "1h" },
	{ value: "4h", label: "4h" },
	{ value: "6h", label: "6h" },
];

/** When the relay is used: requests per block of the day, this week. */
export function WeekHeatmap() {
	const [size, setSize] = useState<CellSize>("4h");
	const { rows, hours } = useWeekActivity(size);
	return (
		<Section
			title="Activity"
			meta="requests by time of day, this week"
			aside={
				<div className="flex items-center gap-5">
					<HeatLegend />
					<Segmented
						variant="underline"
						value={size}
						onChange={setSize}
						options={CELL_OPTIONS}
					/>
				</div>
			}
		>
			<HourHeatmap rows={rows} hours={hours} />
		</Section>
	);
}
