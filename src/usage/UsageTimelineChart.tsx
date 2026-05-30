import { Activity } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type UsageInterval, useUsageTimeline } from "@/api/hooks/usage";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { fmtBucket, fmtInt, fmtRange } from "./format";
import { UsageEmpty } from "./UsageEmpty";

const CONFIG: ChartConfig = {
	requests: { label: "Requests", color: "var(--chart-1)" },
	errors: { label: "Errors", color: "var(--destructive)" },
};

/** Aggregate requests-over-time with an errors overlay. */
export function UsageTimelineChart({ interval }: { interval: UsageInterval }) {
	const { from, to, points } = useUsageTimeline(interval);

	if (points.length === 0) {
		return (
			<UsageEmpty
				icon={Activity}
				title="No usage in this range"
				body={`Request volume over time will chart here once the relay sees traffic, bucketed by ${interval}.`}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="text-[11px] text-muted-foreground">
				{fmtRange(from, to)} · {interval} buckets
			</div>
			<div className="rounded-lg border border-border bg-card p-4">
				<ChartContainer config={CONFIG} className="h-[260px] w-full">
					<AreaChart data={points} margin={{ left: 4, right: 8, top: 8 }}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="bucket"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={32}
							tickFormatter={fmtBucket}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							width={44}
							tickFormatter={fmtInt}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									labelFormatter={(v) => fmtBucket(String(v))}
								/>
							}
						/>
						<ChartLegend content={<ChartLegendContent />} />
						<Area
							dataKey="requests"
							type="monotone"
							stroke="var(--color-requests)"
							fill="var(--color-requests)"
							fillOpacity={0.2}
						/>
						<Area
							dataKey="errors"
							type="monotone"
							stroke="var(--color-errors)"
							fill="var(--color-errors)"
							fillOpacity={0.25}
						/>
					</AreaChart>
				</ChartContainer>
			</div>
		</div>
	);
}
