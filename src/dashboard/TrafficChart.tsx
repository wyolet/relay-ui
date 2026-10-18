import { Suspense, useState } from "react";
import { useCostTimeline } from "@/api/hooks/cost";
import { type UsageMetric, useStackedTimeline } from "@/api/hooks/usage";
import { Section } from "@/shared/Section";
import { Segmented } from "@/shared/Segmented";
import { StackedUsageChart } from "@/usage/StackedUsageChart";

const METRICS: { value: UsageMetric; label: string }[] = [
	{ value: "requests", label: "Requests" },
	{ value: "cost", label: "Spend" },
	{ value: "tokens", label: "Tokens" },
];

/** This week by model, switchable between requests, spend and tokens. */
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
	const data = useStackedTimeline("model_id", "week", metric);
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
	const data = useCostTimeline("model_id", "week");
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
