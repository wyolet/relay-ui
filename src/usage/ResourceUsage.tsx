import { Suspense, useState } from "react";
import {
	type ResourceUsageDimension,
	USAGE_INTERVALS,
	type UsageInterval,
	useResourceTimeline,
	useResourceUsage,
} from "@/api/hooks/usage";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ResourceUsageCards } from "@/shared/ResourceUsageCards";
import { RequestsAreaChart } from "./RequestsAreaChart";

/**
 * Per-resource Usage tab: scoped KPI cards + a requests/errors timeline for one
 * host/model/policy, off /usage/summary and /usage/timeseries filtered by id.
 */
export function ResourceUsage({
	scope,
	id,
}: {
	scope: ResourceUsageDimension;
	id: string;
}) {
	const [interval, setInterval] = useState<UsageInterval>("1h");

	return (
		<div className="flex flex-col gap-4 pt-2">
			<Suspense fallback={<CardsSkeleton />}>
				<Cards scope={scope} id={id} />
			</Suspense>

			<div className="flex items-center justify-between">
				<h2 className="text-sm font-medium text-foreground">Over time</h2>
				<span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
					Interval
					<Select
						items={USAGE_INTERVALS.map((i) => ({ label: i, value: i }))}
						value={interval}
						onValueChange={(v) => {
							const next = USAGE_INTERVALS.find((i) => i === v);
							if (next) setInterval(next);
						}}
					>
						<SelectTrigger className="h-7 w-[88px] text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{USAGE_INTERVALS.map((i) => (
								<SelectItem key={i} value={i} className="text-xs">
									{i}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</span>
			</div>

			<Suspense fallback={<ChartSkeleton />}>
				<Chart scope={scope} id={id} interval={interval} />
			</Suspense>
		</div>
	);
}

function Cards({ scope, id }: { scope: ResourceUsageDimension; id: string }) {
	const usage = useResourceUsage(scope, id);
	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
			<ResourceUsageCards usage={usage} />
		</div>
	);
}

function Chart({
	scope,
	id,
	interval,
}: {
	scope: ResourceUsageDimension;
	id: string;
	interval: UsageInterval;
}) {
	const { from, to, points } = useResourceTimeline(scope, id, interval);
	return (
		<RequestsAreaChart
			points={points}
			from={from}
			to={to}
			interval={interval}
			emptyBody="No requests for this resource in this range yet."
		/>
	);
}

function CardsSkeleton() {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
			{["Requests", "Error rate", "p95 latency", "Tokens"].map((l) => (
				<div
					key={l}
					className="rounded-md border border-border bg-card px-3 py-2"
				>
					<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
						{l}
					</div>
					<div className="mt-0.5 text-lg font-semibold text-muted-foreground tabular-nums">
						…
					</div>
				</div>
			))}
		</div>
	);
}

function ChartSkeleton() {
	return (
		<div className="rounded-lg border border-border bg-card py-16 text-center text-sm text-muted-foreground">
			Loading…
		</div>
	);
}
