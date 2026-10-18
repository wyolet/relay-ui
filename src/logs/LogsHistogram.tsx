import { useMemo, useState } from "react";
import { Bar, BarChart, XAxis } from "recharts";
import { type LogsFilter, useLogsHistogram } from "@/api/hooks/logs";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Segmented } from "@/shared/Segmented";
import { fmtInt } from "./format";

const WINDOW_LABEL: Record<string, string> = {
	"1h": "last 1h",
	"6h": "last 6h",
	"24h": "last 24h",
	"7d": "last 7d",
	"30d": "last 30d",
};

type Metric = "requests" | "tokens";

const CONFIG: ChartConfig = {
	ok: { label: "ok", color: "var(--chart-2)" },
	errors: { label: "error", color: "var(--destructive)" },
	tokens: { label: "Tokens", color: "var(--chart-2)" },
};

/** Bucket start as a compact local label — time of day, or date for day buckets. */
function bucketLabel(ts: string, dayBuckets: boolean): string {
	const d = new Date(ts);
	if (Number.isNaN(d.getTime())) return ts;
	return dayBuckets
		? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
		: d.toLocaleString(undefined, {
				month: "short",
				day: "numeric",
				hour: "numeric",
				minute: "2-digit",
			});
}

/**
 * Volume histogram over the window, scoped by the feed's dimension filters.
 * Toggles between request count (errors stacked) and token throughput.
 * Non-blocking — renders a quiet placeholder while loading or when empty.
 */
export function LogsHistogram({ filter }: { filter: LogsFilter }) {
	const { points, isLoading } = useLogsHistogram(filter);
	const [metric, setMetric] = useState<Metric>("requests");
	const windowLabel = WINDOW_LABEL[filter.since ?? "1h"] ?? "window";
	const dayBuckets = filter.since === "7d" || filter.since === "30d";
	const hasData = points.some((p) => p.requests > 0 || p.tokens > 0);

	// Split ok/error so the request bars stack; carry tokens for the other mode.
	const data = useMemo(
		() =>
			points.map((p) => ({
				bucket: p.bucket,
				ok: Math.max(p.requests - p.errors, 0),
				errors: p.errors,
				tokens: p.tokens,
			})),
		[points],
	);

	return (
		<div>
			<div className="mb-3 flex items-center justify-between text-meta text-ink-3">
				<span>
					{metric === "tokens" ? "Tokens" : "Requests"} over time ·{" "}
					{windowLabel}
				</span>
				<span className="inline-flex items-center gap-3">
					{metric === "requests" && (
						<span className="inline-flex items-center gap-3">
							<span className="inline-flex items-center gap-1">
								<span className="size-2 rounded-full bg-chart-2" /> ok
							</span>
							<span className="inline-flex items-center gap-1">
								<span className="size-2 rounded-full bg-destructive" /> error
							</span>
						</span>
					)}
					<Segmented
						value={metric}
						onChange={setMetric}
						options={[
							{ value: "requests", label: "Requests" },
							{ value: "tokens", label: "Tokens" },
						]}
					/>
				</span>
			</div>

			{isLoading || !hasData ? (
				<div className="flex h-24 items-center justify-center text-meta text-ink-3">
					{isLoading ? "Loading…" : "No traffic in this window."}
				</div>
			) : (
				<ChartContainer config={CONFIG} className="h-24 w-full">
					<BarChart data={data} margin={{ top: 4 }} barCategoryGap="20%">
						<XAxis dataKey="bucket" hide />
						<ChartTooltip
							cursor={{ fill: "var(--muted)", opacity: 0.4 }}
							content={
								<ChartTooltipContent
									labelFormatter={(_, payload) =>
										bucketLabel(
											String(payload?.[0]?.payload?.bucket),
											dayBuckets,
										)
									}
									formatter={(value, name) => (
										<span className="text-muted-foreground">
											{fmtInt(Number(value))}{" "}
											{name === "tokens"
												? "tokens"
												: name === "errors"
													? "err"
													: "ok"}
										</span>
									)}
								/>
							}
						/>
						{metric === "tokens" ? (
							<Bar
								dataKey="tokens"
								fill="var(--color-tokens)"
								radius={[2, 2, 0, 0]}
							/>
						) : (
							<>
								<Bar dataKey="ok" stackId="r" fill="var(--color-ok)" />
								<Bar
									dataKey="errors"
									stackId="r"
									fill="var(--color-errors)"
									radius={[2, 2, 0, 0]}
								/>
							</>
						)}
					</BarChart>
				</ChartContainer>
			)}
		</div>
	);
}
