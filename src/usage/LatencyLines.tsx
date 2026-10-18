import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { UsageGroupBy, UsageInterval } from "@/api/hooks/usage";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { AXIS_PROPS, Y_TICK_COUNT } from "./chartMarks";
import { dayStartTicks, fmtBucket, fmtBucketTick, fmtMs } from "./format";
import { USAGE_PALETTE } from "./palette";
import { useGroupLabeler } from "./useGroupLabeler";

/** p95 per group over time as lines; percentiles don't add up, so no stack. */
export function LatencyLines({
	points,
	series,
	groupBy,
	interval,
	height = "h-[280px]",
}: {
	points: Record<string, number | string | null>[];
	series: string[];
	groupBy: UsageGroupBy;
	interval: UsageInterval;
	height?: string;
}) {
	const labelFor = useGroupLabeler(groupBy);
	const config: ChartConfig = Object.fromEntries(
		series.map((key, i) => [
			key,
			{ label: labelFor(key), color: USAGE_PALETTE[i % USAGE_PALETTE.length] },
		]),
	);
	const buckets = points.map((p) => String(p.bucket));
	const dayTicks =
		interval !== "1d" && points.length > 60
			? dayStartTicks(buckets)
			: undefined;

	if (series.length === 0) {
		return <p className="text-label text-ink-2">No traffic matches.</p>;
	}

	return (
		<ChartContainer config={config} className={`${height} w-full`}>
			<LineChart data={points} margin={{ left: 4, right: 8, top: 8 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="bucket"
					{...AXIS_PROPS}
					minTickGap={32}
					ticks={dayTicks}
					tickFormatter={(v: string) =>
						fmtBucketTick(v, dayTicks ? "1d" : interval)
					}
				/>
				<YAxis
					{...AXIS_PROPS}
					width={52}
					tickCount={Y_TICK_COUNT}
					tickFormatter={(v: number) => fmtMs(v)}
				/>
				<ChartTooltip
					content={
						<ChartTooltipContent
							labelFormatter={(v) => fmtBucket(String(v), interval)}
							formatter={(value, name) => (
								<span className="flex w-full justify-between gap-4">
									<span className="text-tip-ink/70">
										{config[String(name)]?.label ?? name}
									</span>
									<span className="font-medium tabular-nums">
										{fmtMs(Number(value))}
									</span>
								</span>
							)}
						/>
					}
				/>
				<ChartLegend content={<ChartLegendContent />} />
				{series.map((key) => (
					<Line
						key={key}
						dataKey={key}
						type="monotone"
						stroke={config[key]?.color}
						strokeWidth={1.75}
						dot={false}
						connectNulls={false}
						isAnimationActive={false}
					/>
				))}
			</LineChart>
		</ChartContainer>
	);
}
