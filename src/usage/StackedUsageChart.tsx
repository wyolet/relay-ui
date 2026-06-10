import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	OTHER_KEY,
	type StackedTimeline,
	type UsageGroupBy,
	type UsageMetric,
} from "@/api/hooks/usage";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	dimensionLabel,
	fmtBucket,
	fmtCompact,
	fmtMoney,
	fmtMoneyCompact,
	fmtRange,
} from "./format";
import { OTHER_COLOR, USAGE_PALETTE } from "./palette";
import { UsageEmpty } from "./UsageEmpty";
import { useGroupLabeler } from "./useGroupLabeler";

/** Topmost series in the stack — gets the rounded cap. */
function isLast(key: string, series: string[]): boolean {
	return series[series.length - 1] === key;
}

/**
 * Stacked histogram of one metric over time, split by `groupBy`. Series and
 * their Others-rollup come pre-derived from `useStackedTimeline`; this only
 * resolves labels/colors and renders.
 */
export function StackedUsageChart({
	data,
	groupBy,
	metric,
	currency = "USD",
	bare = false,
	height = "h-[280px]",
}: {
	data: StackedTimeline;
	groupBy: UsageGroupBy;
	metric: UsageMetric;
	/** Formats axis/tooltip values when metric is "cost". */
	currency?: string;
	/** Render only the plot (no card/header) — for embedding in another card. */
	bare?: boolean;
	height?: string;
}) {
	const labelFor = useGroupLabeler(groupBy);

	const config = useMemo<ChartConfig>(() => {
		const c: ChartConfig = {};
		let i = 0;
		for (const key of data.series) {
			if (key === OTHER_KEY) {
				c[key] = { label: "Others", color: OTHER_COLOR };
			} else {
				c[key] = {
					label: labelFor(key),
					color: USAGE_PALETTE[i % USAGE_PALETTE.length],
				};
				i++;
			}
		}
		return c;
	}, [data.series, labelFor]);

	const hasTraffic = data.points.some((p) =>
		data.series.some((k) => Number(p[k]) > 0),
	);

	const isCost = metric === "cost";
	const metricLabel = isCost
		? "Est. spend"
		: metric === "tokens"
			? "Tokens"
			: "Requests";
	const tickFormatter = isCost
		? (n: number) => fmtMoneyCompact(n, currency)
		: fmtCompact;

	if (!hasTraffic) {
		return (
			<UsageEmpty
				icon={BarChart3}
				title="No usage in this range"
				body={`${metricLabel} by ${dimensionLabel(groupBy).toLowerCase()} will stack here once the relay sees traffic in the selected window.`}
			/>
		);
	}

	const plot = (
		<ChartContainer config={config} className={`${height} w-full`}>
			<BarChart data={data.points} margin={{ left: 4, right: 8, top: 8 }}>
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
					width={isCost ? 56 : 44}
					tickFormatter={tickFormatter}
				/>
				<ChartTooltip
					content={
						<ChartTooltipContent
							labelFormatter={(v) => fmtBucket(String(v))}
							formatter={
								isCost
									? (value, name, item) => (
											<div className="flex w-full items-center justify-between gap-4">
												<span className="flex items-center gap-1.5">
													<span
														className="size-2.5 shrink-0 rounded-[2px]"
														style={{ backgroundColor: item.color }}
													/>
													<span className="text-muted-foreground">
														{config[String(name)]?.label ?? name}
													</span>
												</span>
												<span className="font-mono font-medium tabular-nums text-foreground">
													≈{fmtMoney(Number(value), currency)}
												</span>
											</div>
										)
									: undefined
							}
						/>
					}
				/>
				<ChartLegend content={<ChartLegendContent />} />
				{data.series.map((key) => (
					<Bar
						key={key}
						dataKey={key}
						stackId="usage"
						fill={`var(--color-${key})`}
						maxBarSize={56}
						radius={isLast(key, data.series) ? [3, 3, 0, 0] : undefined}
						isAnimationActive={false}
					/>
				))}
			</BarChart>
		</ChartContainer>
	);

	if (bare) return plot;

	return (
		<div className="rounded-lg border border-border bg-card">
			<div className="flex items-center justify-between border-b border-border px-4 py-2.5">
				<h2 className="text-sm font-medium text-foreground">
					{metricLabel} by {dimensionLabel(groupBy).toLowerCase()}
				</h2>
				<span className="text-[11px] text-muted-foreground">
					{fmtRange(data.from, data.to)} · {data.interval} buckets
				</span>
			</div>
			<div className="p-4">{plot}</div>
		</div>
	);
}
