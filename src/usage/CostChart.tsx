import { Banknote } from "lucide-react";
import { useCostTimeline } from "@/api/hooks/cost";
import type { UsageRange } from "@/api/hooks/usage";
import type { CostStackDimension } from "@/lib/usage-math/pricing";
import { dimensionLabel, fmtCompact, fmtRange } from "./format";
import { StackedUsageChart } from "./StackedUsageChart";
import { UsageEmpty } from "./UsageEmpty";
import { useGroupLabeler } from "./useGroupLabeler";

/**
 * Stacked estimated-spend chart. Wraps the shared stacked chart in its own
 * card so it can badge what the $ series deliberately leaves out: unpriced
 * models and mixed-currency stacking.
 */
export function CostChart({
	groupBy,
	range,
	from,
	to,
}: {
	groupBy: CostStackDimension;
	range: UsageRange;
	from?: string;
	to?: string;
}) {
	const data = useCostTimeline(groupBy, range, from, to);
	const labelFor = useGroupLabeler("model_id");

	if (data.series.length === 0) {
		return (
			<UsageEmpty
				icon={Banknote}
				title="No priced usage in this range"
				body={
					data.unpriced.tokens > 0
						? "Traffic exists, but none of its model↔host bindings have pricing attached. Add rates under Configure → Pricing."
						: "Estimated spend stacks here once priced traffic flows in the selected window."
				}
			/>
		);
	}

	const unpricedTitle = data.unpriced.modelIds.map(labelFor).join(", ");

	return (
		<div className="rounded-lg border border-border bg-card">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-medium text-foreground">
						Est. spend by {dimensionLabel(groupBy).toLowerCase()}
					</h2>
					{data.mixed && (
						<Badge title="Bars sum across currencies — totals per currency stay separate in the KPI.">
							mixed currencies
						</Badge>
					)}
					{data.unpriced.modelIds.length > 0 && (
						<Badge title={`Unpriced, excluded: ${unpricedTitle}`}>
							{data.unpriced.modelIds.length} model
							{data.unpriced.modelIds.length === 1 ? "" : "s"} unpriced ·{" "}
							{fmtCompact(data.unpriced.tokens)} tok excluded
						</Badge>
					)}
					{data.hostsTruncated && (
						<Badge title="Too many active hosts for exact attribution — figures cover the busiest only.">
							partial
						</Badge>
					)}
				</div>
				<span className="text-[11px] text-muted-foreground">
					{fmtRange(data.from, data.to)} · {data.interval} buckets
				</span>
			</div>
			<div className="p-4">
				<StackedUsageChart
					data={data}
					groupBy={groupBy}
					metric="cost"
					currency={data.currency ?? "USD"}
					bare
				/>
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
