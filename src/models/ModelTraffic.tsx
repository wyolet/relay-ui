import { useState } from "react";
import {
	MODEL_TRAFFIC_METRICS,
	type ModelTrafficMetric,
	useModelTraffic,
} from "@/models/useModelTraffic";
import { Section } from "@/shared/Section";
import { Segmented } from "@/shared/Segmented";
import { StackedUsageChart } from "@/usage/StackedUsageChart";

/** The model's last 7 days by host; nothing when it had no traffic. */
export function ModelTraffic({ modelId }: { modelId: string }) {
	const [metric, setMetric] = useState<ModelTrafficMetric>("requests");
	const { hasTraffic, data } = useModelTraffic(modelId, metric);
	if (!hasTraffic) return null;
	return (
		<Section
			title="Traffic by host"
			meta="last 7 days"
			aside={
				<Segmented
					variant="underline"
					value={metric}
					onChange={setMetric}
					options={MODEL_TRAFFIC_METRICS}
				/>
			}
		>
			<StackedUsageChart data={data} groupBy="host_id" metric={metric} bare />
		</Section>
	);
}
