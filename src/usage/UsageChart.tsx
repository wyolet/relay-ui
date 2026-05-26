import { Activity } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	type UsageGroupBy,
	type UsageInterval,
	type UsageTimeSeriesResult,
	useUsageTimeseries,
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
	fmtInt,
	fmtRange,
	groupValue,
} from "./format";
import { UsageEmpty } from "./UsageEmpty";

const MAX_SERIES = 5;
const OTHER_KEY = "__other__";
const PALETTE = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
] as const;

type ChartRow = { bucket: string } & Record<string, number | string>;

export function UsageChart({
	interval,
	groupBy,
}: {
	interval: UsageInterval;
	groupBy: UsageGroupBy;
}) {
	const { data } = useUsageTimeseries(interval, groupBy);
	const { rows, config } = usePivot(data, groupBy);

	if (rows.length === 0) {
		return (
			<UsageEmpty
				icon={Activity}
				title="No usage in this range"
				body={`Request volume over time will chart here once the relay sees traffic, bucketed by ${interval} and split by ${dimensionLabel(
					groupBy,
				).toLowerCase()}.`}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="text-[11px] text-muted-foreground">
				{fmtRange(data.from, data.to)} · {interval} buckets · by{" "}
				{dimensionLabel(groupBy).toLowerCase()}
			</div>
			<div className="rounded-lg border border-border bg-card p-4">
				<ChartContainer config={config} className="h-[320px] w-full">
					<AreaChart data={rows} margin={{ left: 4, right: 8, top: 8 }}>
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
						{Object.keys(config).map((key) => (
							<Area
								key={key}
								dataKey={key}
								type="monotone"
								stackId="requests"
								stroke={`var(--color-${key})`}
								fill={`var(--color-${key})`}
								fillOpacity={0.2}
							/>
						))}
					</AreaChart>
				</ChartContainer>
			</div>
		</div>
	);
}

/**
 * Pivots the per-series timeseries into recharts row-per-bucket shape, keeping
 * the top {@link MAX_SERIES} series by total requests and folding the rest into
 * an "Other" series. Cross-series bucket gaps are zero-filled.
 */
function usePivot(data: UsageTimeSeriesResult, groupBy: UsageGroupBy) {
	return useMemo(() => {
		const series = data.rows ?? [];

		const totals = series.map((row) => {
			const total = (row.points ?? []).reduce((a, p) => a + p.requests, 0);
			return { row, label: groupValue(row.group, groupBy), total };
		});
		totals.sort((a, b) => b.total - a.total);

		const top = totals.slice(0, MAX_SERIES);
		const rest = totals.slice(MAX_SERIES);

		const config: ChartConfig = {};
		top.forEach((s, i) => {
			config[s.label] = { label: s.label, color: PALETTE[i % PALETTE.length] };
		});
		if (rest.length > 0) {
			config[OTHER_KEY] = {
				label: `Other (${rest.length})`,
				color: "var(--muted-foreground)",
			};
		}

		// bucket ts -> accumulated row
		const byBucket = new Map<string, ChartRow>();
		const ensure = (bucket: string): ChartRow => {
			let r = byBucket.get(bucket);
			if (!r) {
				r = { bucket };
				for (const key of Object.keys(config)) r[key] = 0;
				byBucket.set(bucket, r);
			}
			return r;
		};

		for (const s of top) {
			for (const p of s.row.points ?? []) {
				const r = ensure(p.bucket);
				r[s.label] = (Number(r[s.label]) || 0) + p.requests;
			}
		}
		for (const s of rest) {
			for (const p of s.row.points ?? []) {
				const r = ensure(p.bucket);
				r[OTHER_KEY] = (Number(r[OTHER_KEY]) || 0) + p.requests;
			}
		}

		const rows = [...byBucket.values()].sort((a, b) =>
			a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0,
		);

		return { rows, config };
	}, [data, groupBy]);
}
