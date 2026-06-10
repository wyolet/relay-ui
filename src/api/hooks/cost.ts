import {
	queryOptions,
	useSuspenseQueries,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { type HostModelRow, hostModelsQueryOptions } from "@/api/hooks/hosts";
import {
	type ResolvedWindow,
	resolveWindow,
	rollingUsageWindow,
	type UsageRange,
	type UsageSummaryFilter,
	type UsageSummaryResult,
	type UsageTimeSeriesResult,
	type UsageWindow,
	usageComparisonWindows,
	usageSummaryQueryOptions,
} from "@/api/hooks/usage";
import { ApiError } from "@/api/types/errors";
import { compareValue, type DeltaResult } from "@/lib/usage-math/delta";
import {
	type BindingPricing,
	type CostCellInput,
	type CostGridResult,
	type CostSeriesRow,
	type CostStackDimension,
	type CostStacked,
	type CostSum,
	deriveCostStacked,
	joinCostGrid,
	type PricingLookup,
} from "@/lib/usage-math/pricing";

/**
 * Exact (model, host) cost attribution. Pricing rides on model↔host bindings
 * and /usage only groups by a single dimension, so the grid is assembled by
 * fan-out: one summary (or timeseries) query per host that saw traffic, each
 * filtered to that host and grouped by model — every token bucket then joins
 * exactly one binding's rates. Hosts are a handful, bounding the fan-out; we
 * still cap it and surface the truncation honestly rather than overrun.
 */
const MAX_COST_HOSTS = 12;

/** Narrows the grid to one resource's traffic (policy, relay key, model, …).
 * Filters combine server-side, so the per-host × per-model cells stay exact
 * even inside a key/policy slice — what the aggregate usage page can't do. */
export type CostSlice = Pick<
	UsageSummaryFilter,
	"model_id" | "host_id" | "policy_id" | "relay_key_hash" | "host_key_id"
>;

/** One host's usage over a window, split by model (optionally sliced). */
export function hostModelSummaryQueryOptions(
	hostId: string,
	win: UsageWindow,
	slice?: CostSlice,
) {
	return queryOptions({
		queryKey: [
			"usage",
			"summary",
			"by-host-model",
			hostId,
			win.from,
			win.to,
			slice ?? {},
		] as const,
		queryFn: async (): Promise<UsageSummaryResult> => {
			const { data, error } = await apiClient.GET("/usage/summary", {
				params: {
					query: {
						...slice,
						group_by: "model_id",
						host_id: [hostId],
						from: win.from,
						to: win.to,
					},
				},
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 15_000,
		gcTime: 5 * 60_000,
	});
}

/** One host's timeseries over a window, one series per model. */
export function hostModelTimeseriesQueryOptions(
	hostId: string,
	win: ResolvedWindow,
) {
	return queryOptions({
		queryKey: [
			"usage",
			"cost-timeseries",
			hostId,
			win.from,
			win.to,
			win.interval,
		] as const,
		queryFn: async (): Promise<UsageTimeSeriesResult> => {
			const { data, error } = await apiClient.GET("/usage/timeseries", {
				params: {
					query: {
						group_by: "model_id",
						host_id: [hostId],
						from: win.from,
						to: win.to,
						interval: win.interval,
					},
				},
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 15_000,
		gcTime: 5 * 60_000,
	});
}

/** Hosts that saw traffic in the window, busiest first, capped (see above). */
interface ActiveHosts {
	ids: string[];
	truncated: boolean;
}

function activeHostIds(data: UsageSummaryResult): ActiveHosts {
	const ids = (data.rows ?? [])
		.filter((r) => r.requests > 0)
		.sort((a, b) => b.requests - a.requests)
		.flatMap((r) => {
			const id = r.group?.host_id?.trim();
			return id ? [id] : [];
		});
	return {
		ids: ids.slice(0, MAX_COST_HOSTS),
		truncated: ids.length > MAX_COST_HOSTS,
	};
}

function buildLookup(
	hostIds: readonly string[],
	rowsPerHost: ReadonlyArray<readonly HostModelRow[]>,
): PricingLookup {
	const lookup = new Map<string, Map<string, BindingPricing>>();
	hostIds.forEach((hostId, i) => {
		const inner = new Map<string, BindingPricing>();
		for (const row of rowsPerHost[i] ?? []) {
			// The schema marks pricing (and model) as required, but the relay
			// serializes null for bindings with no pricing record — treat both as
			// nullable. Absent entries flow through as "unpriced", which is honest.
			const pricing: HostModelRow["pricing"] | null = row.pricing;
			const model: HostModelRow["model"] | null = row.model;
			if (!pricing || !model?.id) continue;
			inner.set(model.id, {
				currency: pricing.currency || "USD",
				rates: pricing.rates ?? [],
			});
		}
		lookup.set(hostId, inner);
	});
	return lookup;
}

/** The per-host binding rows, fetched as one fan keyed off a stable id list. */
function useHostBindings(hostIds: readonly string[]) {
	return useSuspenseQueries({
		queries: hostIds.map((h) => hostModelsQueryOptions(h)),
		combine: (results) => results.map((r) => r.data.models ?? []),
	});
}

export interface CostGrid extends CostGridResult {
	from: string;
	to: string;
	hostIds: string[];
	/** True when the host fan-out hit MAX_COST_HOSTS — figures are partial. */
	hostsTruncated: boolean;
}

/** Exact per-(model, host) cost grid for a window, optionally sliced to one
 * resource's traffic. */
export function useCostGrid(win: UsageWindow, slice?: CostSlice): CostGrid {
	const { data: hostSummary } = useSuspenseQuery(
		usageSummaryQueryOptions("host_id", win, slice),
	);
	const { ids: hostIds, truncated } = activeHostIds(hostSummary);

	const summaries = useSuspenseQueries({
		queries: hostIds.map((h) => hostModelSummaryQueryOptions(h, win, slice)),
		combine: (results) => results.map((r) => r.data),
	});
	const bindings = useHostBindings(hostIds);

	const cells: CostCellInput[] = hostIds.flatMap((hostId, i) =>
		(summaries[i]?.rows ?? []).flatMap((row) => {
			const modelId = row.group?.model_id?.trim();
			if (!modelId) return [];
			return [
				{
					hostId,
					modelId,
					requests: row.requests,
					tokens: row.tokens ?? {},
				},
			];
		}),
	);

	const grid = joinCostGrid(cells, buildLookup(hostIds, bindings));
	return {
		...grid,
		from: hostSummary.from,
		to: hostSummary.to,
		hostIds,
		hostsTruncated: truncated,
	};
}

export interface CostKpi {
	current: CostSum;
	/** Movement of the dominant-currency total vs the previous period; null
	 * when the windows' dominant currencies differ (no honest comparison). */
	delta: DeltaResult | null;
	hasBaseline: boolean;
	/** Share of the window's tokens that no pricing covered, 0..1. */
	unpricedShare: number;
	hostsTruncated: boolean;
}

/** Estimated spend for the window with a period-over-period delta. */
export function useCostKpi(win: UsageWindow): CostKpi {
	const { previous } = usageComparisonWindows(win);
	const current = useCostGrid(win);
	const prior = useCostGrid(previous);

	const dominant = current.total.dominant;
	const priorDominant = prior.total.dominant;
	const comparable =
		dominant != null &&
		priorDominant != null &&
		dominant.currency === priorDominant.currency;

	let pricedTokens = 0;
	for (const cell of current.cells) {
		if (cell.cost == null) continue;
		for (const v of Object.values(cell.tokens)) pricedTokens += v;
	}
	const totalTokens = pricedTokens + current.unpriced.tokens;

	return {
		current: current.total,
		delta: comparable
			? compareValue(dominant.amount, priorDominant.amount)
			: null,
		hasBaseline: priorDominant != null && priorDominant.amount > 0,
		unpricedShare: totalTokens > 0 ? current.unpriced.tokens / totalTokens : 0,
		hostsTruncated: current.hostsTruncated,
	};
}

/** Per-group cost for the leaderboard; only model/host dimensions are exact. */
export function useCostByGroup(
	dimension: CostStackDimension,
	win: UsageWindow,
): Map<string, CostSum> {
	const grid = useCostGrid(win);
	return dimension === "model_id" ? grid.byModel : grid.byHost;
}

export interface CostTimeline extends CostStacked {
	from: string;
	to: string;
	interval: ResolvedWindow["interval"];
	hostsTruncated: boolean;
}

/** Stacked estimated spend per bucket, split by model or host. */
export function useCostTimeline(
	dimension: CostStackDimension,
	range: UsageRange,
	customFrom?: string,
	customTo?: string,
): CostTimeline {
	const win = resolveWindow(range, customFrom, customTo);
	const { data: hostSummary } = useSuspenseQuery(
		usageSummaryQueryOptions("host_id", win),
	);
	const { ids: hostIds, truncated } = activeHostIds(hostSummary);

	const series = useSuspenseQueries({
		queries: hostIds.map((h) => hostModelTimeseriesQueryOptions(h, win)),
		combine: (results) => results.map((r) => r.data),
	});
	const bindings = useHostBindings(hostIds);

	const rows: CostSeriesRow[] = hostIds.flatMap((hostId, i) =>
		(series[i]?.rows ?? []).flatMap((row) => {
			const modelId = row.group?.model_id?.trim();
			if (!modelId) return [];
			return [
				{
					hostId,
					modelId,
					points: (row.points ?? []).map((p) => ({
						bucket: p.bucket,
						tokens: p.tokens ?? {},
					})),
				},
			];
		}),
	);

	const stacked = deriveCostStacked(
		rows,
		buildLookup(hostIds, bindings),
		dimension,
		win.from,
		win.to,
		win.interval,
	);
	return {
		...stacked,
		from: win.from,
		to: win.to,
		interval: win.interval,
		hostsTruncated: truncated,
	};
}

// --- Per-resource spend ---

/** Resources whose detail pages show an Est. spend card. */
export type CostResourceDimension =
	| "model_id"
	| "host_id"
	| "policy_id"
	| "relay_key_hash"
	| "host_key_id";

export interface ResourceSpend {
	sum: CostSum;
	window: UsageWindow;
	hostsTruncated: boolean;
}

function sliceFor(dimension: CostResourceDimension, id: string): CostSlice {
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
 * to the server's 1h default). Exact for every dimension: the slice filter
 * combines with the per-host fan-out, so each cell still joins one binding.
 */
export function useResourceSpend(
	dimension: CostResourceDimension,
	id: string,
): ResourceSpend {
	const win = rollingUsageWindow(1);
	const grid = useCostGrid(win, sliceFor(dimension, id));
	return {
		sum: grid.total,
		window: win,
		hostsTruncated: grid.hostsTruncated,
	};
}
