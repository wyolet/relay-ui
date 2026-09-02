import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import {
	type ResolvedWindow,
	resolveWindow,
	rollingUsageWindow,
	stackedTimeseriesQueryOptions,
	type UsageGroupBy,
	type UsageRange,
	type UsageSummaryFilter,
	type UsageWindow,
	usageComparisonWindows,
	usageSummaryQueryOptions,
	usageTotalsQueryOptions,
} from "@/api/hooks/usage";
import {
	type CostTotal,
	costTotal,
	NANOS_PER_USD,
	sumCostRows,
} from "@/lib/usage-math/cost";
import { compareValue, type DeltaResult } from "@/lib/usage-math/delta";
import {
	type SeriesSample,
	type StackedSeries,
	stackSamples,
} from "@/lib/usage-math/stack";

/**
 * Spend figures read straight off /usage responses. The relay stamps each
 * event's cost at emit time (nano-USD, from the pricing then in effect) and
 * aggregates `cost_nanos` + an `unpriced` event count onto every summary row
 * and timeseries bucket — so cost is exact for EVERY group_by dimension and
 * survives deleted catalog entities. These hooks reuse the same query options
 * (and therefore cache entries) the usage page already fetches; none of them
 * issue extra requests beyond the previous-window comparison.
 */

export interface CostKpi {
	current: CostTotal;
	/** Movement vs the previous period; null when either window had no
	 * priced traffic (no honest comparison). */
	delta: DeltaResult | null;
	hasBaseline: boolean;
}

/** Estimated spend for the window with a period-over-period delta. Reads the
 * same ungrouped totals row the latency profile uses. */
export function useCostKpi(win: UsageWindow): CostKpi {
	const { previous } = usageComparisonWindows(win);
	const [current, prior] = useSuspenseQueries({
		queries: [usageTotalsQueryOptions(win), usageTotalsQueryOptions(previous)],
	});
	const sum = sumCostRows(current.data.rows ?? []);
	const prevSum = sumCostRows(prior.data.rows ?? []);
	return {
		current: sum,
		delta:
			sum.usd != null && prevSum.usd != null
				? compareValue(sum.usd, prevSum.usd)
				: null,
		hasBaseline: prevSum.usd != null && prevSum.usd > 0,
	};
}

export interface CostTimeline extends StackedSeries {
	from: string;
	to: string;
	interval: ResolvedWindow["interval"];
	/** Events excluded from the $ stacks for lack of a cost stamp, and the
	 * group keys that saw them. */
	unpriced: { events: number; groups: string[] };
}

/** Stacked estimated spend per bucket, split by any usage dimension. Shares
 * the timeseries cache entry with the requests/tokens chart. */
export function useCostTimeline(
	groupBy: UsageGroupBy,
	range: UsageRange,
	customFrom?: string,
	customTo?: string,
): CostTimeline {
	const win = resolveWindow(range, customFrom, customTo);
	const { data } = useSuspenseQuery(
		stackedTimeseriesQueryOptions(groupBy, win),
	);

	const samples: SeriesSample[] = [];
	const unpricedGroups = new Set<string>();
	let unpricedEvents = 0;
	for (const row of data.rows ?? []) {
		const key = row.group?.[groupBy]?.trim() || "—";
		const rowSamples: SeriesSample[] = [];
		let priced = false;
		for (const p of row.points ?? []) {
			unpricedEvents += p.unpriced;
			if (p.unpriced > 0) unpricedGroups.add(key);
			if (p.requests - p.unpriced > 0) priced = true;
			rowSamples.push({
				key,
				bucket: p.bucket,
				value: p.cost_nanos / NANOS_PER_USD,
			});
		}
		// A series whose every event is unpriced would stack as a flat $0 lie —
		// leave it out; its volume is still reported via `unpriced`.
		if (priced) samples.push(...rowSamples);
	}

	return {
		...stackSamples(samples, win.from, win.to, win.interval),
		from: win.from,
		to: win.to,
		interval: win.interval,
		unpriced: { events: unpricedEvents, groups: [...unpricedGroups] },
	};
}

// --- Per-resource spend ---

/** Resources whose detail pages show an Est. spend card. */
// Catalog resources only: "source" and the dynamic map dimensions have no
// resource card.
export type CostResourceDimension = Exclude<
	UsageGroupBy,
	"source" | `extras.${string}`
>;

export interface ResourceSpend {
	sum: CostTotal;
	window: UsageWindow;
}

function sliceFor(
	dimension: CostResourceDimension,
	id: string,
): UsageSummaryFilter {
	switch (dimension) {
		case "model_id":
			return { model_id: [id] };
		case "host_id":
			return { host_id: [id] };
		case "policy_id":
			return { policy_id: [id] };
		case "relay_key_hash":
			return { relay_key_hash: [id] };
		case "host_key_id":
			return { host_key_id: [id] };
	}
}

/**
 * One resource's estimated spend over the trailing hour — the same window the
 * neighbouring resource cards show (their unwindowed /usage/summary falls back
 * to the server's 1h default).
 */
export function useResourceSpend(
	dimension: CostResourceDimension,
	id: string,
): ResourceSpend {
	const win = rollingUsageWindow(1);
	const { data } = useSuspenseQuery(
		usageSummaryQueryOptions(dimension, win, sliceFor(dimension, id)),
	);
	const row = (data.rows ?? [])[0];
	return {
		sum: row
			? costTotal(row.cost_nanos, row.unpriced, row.requests)
			: costTotal(0, 0, 0),
		window: win,
	};
}
