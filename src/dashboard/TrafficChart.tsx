import { Suspense, useState } from "react";
import { useCostSeries } from "@/api/hooks/cost";
import { type UsageMetric, useStackedSeries } from "@/api/hooks/usage";
import { Section } from "@/shared/Section";
import { Segmented } from "@/shared/Segmented";
import { StackedUsageChart } from "@/usage/StackedUsageChart";
import { weekByHour } from "./useWeekActivity";

const METRICS: { value: UsageMetric; label: string }[] = [
	{ value: "requests", label: "Requests" },
	{ value: "cost", label: "Spend" },
	{ value: "tokens", label: "Tokens" },
];

/** This week by model and hour, switchable between requests, spend and tokens. */
export function TrafficChart() {
	const [metric, setMetric] = useState<UsageMetric>("requests");
	return (
		<Section
			title="Traffic by model"
			meta="this week"
			aside={
				<Segmented
					variant="underline"
					value={metric}
					onChange={setMetric}
					options={METRICS}
				/>
			}
		>
			<Suspense fallback={<div className="h-[260px]" />}>
				{metric === "cost" ? <SpendPlot /> : <VolumePlot metric={metric} />}
			</Suspense>
		</Section>
	);
}

function VolumePlot({ metric }: { metric: "requests" | "tokens" }) {
	const data = useStackedSeries("model_id", weekByHour(), metric);
	return (
		<StackedUsageChart
			data={data}
			groupBy="model_id"
			metric={metric}
			bare
			height="h-[260px]"
		/>
	);
}

function SpendPlot() {
	const data = useCostSeries("model_id", weekByHour());
	return (
		<StackedUsageChart
			data={data}
			groupBy="model_id"
			metric="cost"
			bare
			height="h-[260px]"
		/>
	);
}
