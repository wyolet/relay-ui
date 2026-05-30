import { Activity } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { UsageTimelinePoint } from "@/api/hooks/usage";
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

/** Presentational requests-over-time area chart with an errors overlay. */
export function RequestsAreaChart({
	points,
	from,
	to,
	interval,
	title = "Requests",
	emptyBody,
}: {
	points: UsageTimelinePoint[];
	from: string;
	to: string;
	interval: string;
	title?: string;
	emptyBody?: string;
}) {
	if (points.length === 0) {
		return (
			<UsageEmpty
				icon={Activity}
				title="No usage in this range"
				body={
					emptyBody ??
					`Request volume over time will chart here once the relay sees traffic, bucketed by ${interval}.`
				}
			/>
		);
	}

	return (
		<div className="rounded-lg border border-border bg-card">
			<div className="flex items-center justify-between border-b border-border px-4 py-2.5">
				<h2 className="text-sm font-medium text-foreground">{title}</h2>
				<span className="text-[11px] text-muted-foreground">
					{fmtRange(from, to)} · {interval} buckets
				</span>
			</div>
			<div className="p-4">
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
