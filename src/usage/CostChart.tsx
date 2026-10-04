import { Banknote } from "lucide-react";
import { useCostTimeline } from "@/api/hooks/cost";
import type {
	UsageGroupBy,
	UsageRange,
	UsageSummaryFilter,
} from "@/api/hooks/usage";
import { dimensionLabel, fmtCompact, fmtRange } from "./format";
import { StackedUsageChart } from "./StackedUsageChart";
import { UsageEmpty } from "./UsageEmpty";
import { useGroupLabeler } from "./useGroupLabeler";

/**
 * Stacked estimated-spend chart. Wraps the shared stacked chart in its own
 * card so it can badge what the $ series deliberately leaves out: traffic
 * with no cost stamp (unpriced at event time).
 */
export function CostChart({
	groupBy,
	range,
	from,
	to,
	filter,
}: {
	groupBy: UsageGroupBy;
	range: UsageRange;
	from?: string;
	to?: string;
	filter?: UsageSummaryFilter;
}) {
	const data = useCostTimeline(groupBy, range, from, to, filter);
	const labelFor = useGroupLabeler(groupBy);

	if (data.series.length === 0) {
		return (
			<UsageEmpty
				icon={Banknote}
				title="No priced usage in this range"
				body={
					data.unpriced.events > 0
						? "Traffic exists, but none of it carried a cost stamp — attach rates under Configure → Pricing. Past traffic stays unpriced; new requests are costed from then on."
						: "Estimated spend stacks here once priced traffic flows in the selected window."
				}
			/>
		);
	}

	const unpricedTitle = data.unpriced.groups.map(labelFor).join(", ");

	return (
		<div className="rounded-lg border border-border bg-card">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-medium text-foreground">
						Est. spend by {dimensionLabel(groupBy).toLowerCase()}
					</h2>
					{data.unpriced.events > 0 && (
						<Badge title={`Unpriced traffic seen on: ${unpricedTitle}`}>
							{fmtCompact(data.unpriced.events)} req unpriced
						</Badge>
					)}
				</div>
				<span className="text-[11px] text-muted-foreground">
					{fmtRange(data.from, data.to)} · {data.interval} buckets
				</span>
			</div>
			<div className="p-4">
				<StackedUsageChart data={data} groupBy={groupBy} metric="cost" bare />
			</div>
		</div>
	);
}

function Badge({
	children,
	title,
}: {
	children: React.ReactNode;
	title: string;
}) {
	return (
		<span
			title={title}
			className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
		>
			{children}
		</span>
	);
}
