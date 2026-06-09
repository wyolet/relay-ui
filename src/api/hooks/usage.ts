import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components, operations } from "@/api/types.gen";

// --- Schema-derived types ---

export type UsageSummaryResult = components["schemas"]["SummaryResult"];
export type UsageSummaryRow = components["schemas"]["SummaryRow"];
export type UsageTimeSeriesResult = components["schemas"]["TimeSeriesResult"];
export type UsageDurationStats = components["schemas"]["DurationStats"];

/**
 * Dimensions the relay can group usage by. Shared by /usage/summary and
 * /usage/timeseries (which both accept `group_by`). "source" is the default.
 */
export const USAGE_GROUP_BY = [
	"source",
	"model_id",
	"host_id",
	"policy_id",
	"relay_key_hash",
	"host_key_id",
] as const;
export type UsageGroupBy = (typeof USAGE_GROUP_BY)[number];

/** Bucket widths offered for the timeseries chart. */
export const USAGE_INTERVALS = ["5m", "1h", "1d"] as const;
export type UsageInterval = (typeof USAGE_INTERVALS)[number];

// --- Query options ---

export function usageSummaryQueryOptions(groupBy: UsageGroupBy) {
	return queryOptions({
		queryKey: ["usage", "summary", groupBy] as const,
		queryFn: async (): Promise<UsageSummaryResult> => {
			const { data, error } = await apiClient.GET("/usage/summary", {
				params: { query: { group_by: groupBy } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 15_000,
		gcTime: 5 * 60_000,
	});
}

// --- Per-resource usage (scoped /usage/summary) ---

type UsageSummaryQuery = NonNullable<
	operations["usage_summary"]["parameters"]["query"]
>;

/** A resource whose usage we can scope by id via the matching filter param. */
export type ResourceUsageDimension = "host_id" | "model_id" | "policy_id";

/** One resource's totals over the summary window (null when it has no traffic). */
export interface ResourceUsageStats {
	requests: number;
	errorCount: number;
	errorRate: number; // 0..1
	duration: UsageDurationStats;
	tokens: number;
	from: string;
	to: string;
}

export function resourceUsageQueryOptions(
	dimension: ResourceUsageDimension,
	id: string,
) {
	return queryOptions({
		queryKey: ["usage", "resource", dimension, id] as const,
		queryFn: async (): Promise<UsageSummaryResult> => {
			const query: UsageSummaryQuery = { group_by: dimension };
			query[dimension] = [id];
			const { data, error } = await apiClient.GET("/usage/summary", {
				params: { query },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 15_000,
		gcTime: 5 * 60_000,
	});
}

/**
 * One model's usage split by host (`group_by=host_id`, filtered to the model).
 * Feeds the per-host pricing tab's estimated-spend figures.
 */
export function modelHostUsageQueryOptions(modelId: string) {
	return queryOptions({
		queryKey: ["usage", "summary", "model-host", modelId] as const,
		queryFn: async (): Promise<UsageSummaryResult> => {
			const query: UsageSummaryQuery = {
				group_by: "host_id",
				model_id: [modelId],
			};
			const { data, error } = await apiClient.GET("/usage/summary", {
				params: { query },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/** Real per-resource stats for host/model/policy Overview cards. */
export function useResourceUsage(
	dimension: ResourceUsageDimension,
	id: string,
): ResourceUsageStats | null {
	const { data } = useSuspenseQuery(resourceUsageQueryOptions(dimension, id));
	const row = (data.rows ?? [])[0];
	if (!row) return null;
	return {
		requests: row.requests,
		errorCount: row.error_count,
		errorRate: row.requests > 0 ? row.error_count / row.requests : 0,
		duration: row.duration_ms,
		tokens: sumTokens(row.tokens),
		from: data.from,
		to: data.to,
	};
}

export function usageTimeseriesQueryOptions(
	interval: UsageInterval,
	groupBy: UsageGroupBy,
	since: string,
) {
	return queryOptions({
		queryKey: ["usage", "timeseries", interval, groupBy, since] as const,
		queryFn: async (): Promise<UsageTimeSeriesResult> => {
			const { data, error } = await apiClient.GET("/usage/timeseries", {
				params: { query: { interval, group_by: groupBy, since } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 15_000,
		gcTime: 5 * 60_000,
	});
}

// --- Time range presets ---

/** Range presets offered by the usage page. `custom` reads explicit from/to. */
export const USAGE_RANGES = ["today", "week", "month", "custom"] as const;
export type UsageRange = (typeof USAGE_RANGES)[number];

export const USAGE_RANGE_LABELS: Record<UsageRange, string> = {
	today: "Today",
	week: "This week",
	month: "This month",
	custom: "Custom",
};

/** A concrete [from, to] window plus the bucket width to chart it at. */
export interface ResolvedWindow {
	from: string;
	to: string;
	interval: UsageInterval;
}

/** Pick a bucket width that yields a readable bar count for a span. */
function intervalForSpan(spanMs: number): UsageInterval {
	if (spanMs <= 3 * 60 * 60_000) return "5m";
	if (spanMs <= 2 * 24 * 60 * 60_000) return "1h";
	return "1d";
}

/**
 * "Now", floored to a 5-minute step. Quantizing keeps `to` (and therefore the
 * query key) byte-stable across renders, so the chart doesn't re-key — and
 * therefore re-fetch — on every render. It also caps refresh churn: the window
 * only advances once per 5 minutes.
 */
const NOW_QUANTUM_MS = 5 * 60_000;
function quantizedNow(): Date {
	return new Date(Math.floor(Date.now() / NOW_QUANTUM_MS) * NOW_QUANTUM_MS);
}

/**
 * Resolve a preset (or explicit custom from/to) into an absolute window with a
 * sensible interval. Anchored to the local clock so "Today"/"This week"/"This
 * month" mean calendar boundaries, not rolling spans.
 */
export function resolveWindow(
	range: UsageRange,
	customFrom?: string,
	customTo?: string,
): ResolvedWindow {
	if (range === "custom" && customFrom) {
		const fromMs = Date.parse(customFrom);
		const toMs = customTo ? Date.parse(customTo) : quantizedNow().getTime();
		const safeTo = Number.isNaN(toMs) ? quantizedNow().getTime() : toMs;
		return {
			from: new Date(fromMs).toISOString(),
			to: new Date(safeTo).toISOString(),
			interval: intervalForSpan(Math.max(safeTo - fromMs, 0)),
		};
	}

	// `start` = first slot of the period, `end` = first slot *after* it, so the
	// grid spans the whole period (e.g. all 30 days of the month), not just the
	// elapsed part. Future buckets simply come back empty from the server.
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	let interval: UsageInterval;
	if (range === "today") {
		end.setDate(end.getDate() + 1);
		interval = "1h";
	} else if (range === "week") {
		// Back up to Monday (treat Sunday=0 as the 7th day); span 7 days.
		const dow = (start.getDay() + 6) % 7;
		start.setDate(start.getDate() - dow);
		end.setTime(start.getTime());
		end.setDate(end.getDate() + 7);
		interval = "1d";
	} else {
		start.setDate(1);
		end.setTime(start.getTime());
		end.setMonth(end.getMonth() + 1);
		interval = "1d";
	}
	return { from: start.toISOString(), to: end.toISOString(), interval };
}

// --- Stacked-by-dimension timeline ---

/** Which metric the stacked chart plots per bucket. */
export const USAGE_METRICS = ["requests", "tokens"] as const;
export type UsageMetric = (typeof USAGE_METRICS)[number];

/** Series with less than this share of total volume fold into "Others". */
const OTHER_SHARE = 0.05;
/** Hard cap on distinct series before the rest fold into "Others". */
const MAX_SERIES = 6;
export const OTHER_KEY = "__other";

/** One stacked bucket: epoch label plus a value per series key. */
export type StackedPoint = { bucket: string } & Record<string, number | string>;

export interface StackedTimeline {
	from: string;
	to: string;
	interval: UsageInterval;
	points: StackedPoint[];
	/** Ordered series keys present in the data (largest first, OTHER_KEY last). */
	series: string[];
}

export function stackedTimeseriesQueryOptions(
	groupBy: UsageGroupBy,
	win: ResolvedWindow,
) {
	return queryOptions({
		queryKey: ["usage", "stacked", groupBy, win.from, win.to, win.interval],
		queryFn: async (): Promise<UsageTimeSeriesResult> => {
			const { data, error } = await apiClient.GET("/usage/timeseries", {
				params: {
					query: {
						group_by: groupBy,
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

type TimeSeriesPoint = components["schemas"]["TimeSeriesPoint"];

function metricValue(p: TimeSeriesPoint, metric: UsageMetric): number {
	return metric === "tokens" ? sumTokens(p.tokens) : p.requests;
}

function deriveStacked(
	rows: UsageTimeSeriesResult["rows"],
	groupBy: UsageGroupBy,
	metric: UsageMetric,
	from: string,
	to: string,
	interval: UsageInterval,
): { points: StackedPoint[]; series: string[] } {
	// Total per series across the window → decide who survives vs folds to Others.
	const totals = new Map<string, number>();
	let grand = 0;
	for (const row of rows ?? []) {
		const key = row.group?.[groupBy]?.trim() || "—";
		let sum = 0;
		for (const p of row.points ?? []) sum += metricValue(p, metric);
		totals.set(key, (totals.get(key) ?? 0) + sum);
		grand += sum;
	}

	const ranked = [...totals.entries()].sort(([, a], [, b]) => b - a);
	const keep = new Set<string>();
	for (const [key, total] of ranked) {
		if (keep.size >= MAX_SERIES) break;
		if (grand > 0 && total / grand < OTHER_SHARE) break;
		keep.add(key);
	}
	const hasOther = keep.size < totals.size;

	// Zero-filled bucket grid over the FULL window, aligned to local calendar
	// units (so daily bars sit on local midnights, hourly on the hour — DST-safe,
	// since setDate/setHours respect the local offset). Empty buckets render as
	// gaps instead of collapsing the axis to only the buckets that had traffic.
	const toMs = Date.parse(to);
	const byEpoch = new Map<number, StackedPoint>();
	const order: number[] = [];
	let t = floorToInterval(Date.parse(from), interval);
	for (let guard = 0; t <= toMs && guard < 5000; guard++) {
		const seed: StackedPoint = { bucket: new Date(t).toISOString() };
		for (const k of keep) seed[k] = 0;
		if (hasOther) seed[OTHER_KEY] = 0;
		byEpoch.set(t, seed);
		order.push(t);
		t = advanceInterval(t, interval);
	}

	for (const row of rows ?? []) {
		const rawKey = row.group?.[groupBy]?.trim() || "—";
		const key = keep.has(rawKey) ? rawKey : OTHER_KEY;
		for (const p of row.points ?? []) {
			const epoch = floorToInterval(Date.parse(p.bucket), interval);
			const bucket = byEpoch.get(epoch);
			if (!bucket) continue;
			bucket[key] = (Number(bucket[key]) || 0) + metricValue(p, metric);
		}
	}

	const series = ranked
		.filter(([k]) => keep.has(k))
		.map(([k]) => k);
	if (hasOther) series.push(OTHER_KEY);
	const points = order.map((epoch) => byEpoch.get(epoch) as StackedPoint);
	return { points, series };
}

/** Floor a timestamp to the start of its local bucket (5m / hour / day). */
function floorToInterval(ms: number, interval: UsageInterval): number {
	const d = new Date(ms);
	if (interval === "1d") {
		d.setHours(0, 0, 0, 0);
	} else if (interval === "1h") {
		d.setMinutes(0, 0, 0);
	} else {
		d.setSeconds(0, 0);
		d.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
	}
	return d.getTime();
}

/** Advance a timestamp by one local bucket (DST-safe via Date mutators). */
function advanceInterval(ms: number, interval: UsageInterval): number {
	const d = new Date(ms);
	if (interval === "1d") d.setDate(d.getDate() + 1);
	else if (interval === "1h") d.setHours(d.getHours() + 1);
	else d.setMinutes(d.getMinutes() + 5);
	return d.getTime();
}

/** Stacked requests/tokens over time, split by `groupBy`, small series merged. */
export function useStackedTimeline(
	groupBy: UsageGroupBy,
	range: UsageRange,
	metric: UsageMetric,
	customFrom?: string,
	customTo?: string,
): StackedTimeline {
	// Window resolution (quantized → stable key) lives here, not in the route.
	const win = resolveWindow(range, customFrom, customTo);
	const { data } = useSuspenseQuery(stackedTimeseriesQueryOptions(groupBy, win));
	const { points, series } = deriveStacked(
		data.rows,
		groupBy,
		metric,
		win.from,
		win.to,
		win.interval,
	);
	return { from: win.from, to: win.to, interval: win.interval, points, series };
}

// --- Derived overview shapes ---

/** Top-line KPIs for the selected window, aggregated across all groups. */
export interface UsageKpis {
	requests: number;
	errors: number;
	errorRate: number; // 0..1
	avgMs: number; // request-weighted mean latency
	tokens: number;
}

/** One leaderboard entry: a group's totals plus its share of peak volume. */
export interface UsageGroupStat {
	key: string;
	requests: number;
	errorCount: number;
	errorRate: number; // 0..1
	duration: UsageDurationStats;
	tokens: number;
	share: number; // requests / max(requests), 0..1
}

/** A single aggregated time bucket across every group. */
export interface UsageTimelinePoint {
	bucket: string;
	requests: number;
	errors: number;
}

function deriveKpis(rows: UsageSummaryRow[]): UsageKpis {
	let requests = 0;
	let errors = 0;
	let tokens = 0;
	let weightedMs = 0;
	for (const r of rows) {
		requests += r.requests;
		errors += r.error_count;
		tokens += sumTokens(r.tokens);
		weightedMs += r.duration_ms.avg * r.requests;
	}
	return {
		requests,
		errors,
		errorRate: requests > 0 ? errors / requests : 0,
		avgMs: requests > 0 ? weightedMs / requests : 0,
		tokens,
	};
}

function deriveGroupStats(
	rows: UsageSummaryRow[],
	groupBy: UsageGroupBy,
): UsageGroupStat[] {
	const peak = rows.reduce((m, r) => Math.max(m, r.requests), 0);
	return rows
		.map((r) => ({
			key: r.group?.[groupBy]?.trim() || "—",
			requests: r.requests,
			errorCount: r.error_count,
			errorRate: r.requests > 0 ? r.error_count / r.requests : 0,
			duration: r.duration_ms,
			tokens: sumTokens(r.tokens),
			share: peak > 0 ? r.requests / peak : 0,
		}))
		.sort((a, b) => b.requests - a.requests);
}

const INTERVAL_SECONDS: Record<UsageInterval, number> = {
	"5m": 5 * 60,
	"1h": 60 * 60,
	"1d": 24 * 60 * 60,
};

/**
 * Aggregate per-bucket requests/errors across every series, then zero-fill the
 * full [from, to] window. The server omits empty buckets (see /usage/timeseries
 * docs), so without this the chart's axis only spans buckets that had traffic —
 * making the range look random and the plot sparse.
 */
function deriveTimeline(
	rows: UsageTimeSeriesResult["rows"],
	from: string,
	to: string,
	interval: UsageInterval,
): UsageTimelinePoint[] {
	const byEpoch = new Map<number, { requests: number; errors: number }>();
	for (const series of rows ?? []) {
		for (const p of series.points ?? []) {
			const epoch = Date.parse(p.bucket);
			if (Number.isNaN(epoch)) continue;
			const point = byEpoch.get(epoch) ?? { requests: 0, errors: 0 };
			point.requests += p.requests;
			point.errors += p.error_count;
			byEpoch.set(epoch, point);
		}
	}

	const stepMs = INTERVAL_SECONDS[interval] * 1000;
	const fromMs = Date.parse(from);
	const toMs = Date.parse(to);
	if (Number.isNaN(fromMs) || Number.isNaN(toMs) || stepMs <= 0) {
		// Fall back to whatever buckets exist, sorted, if the window is unusable.
		return [...byEpoch.entries()]
			.sort(([a], [b]) => a - b)
			.map(([epoch, v]) => ({
				bucket: new Date(epoch).toISOString(),
				...v,
			}));
	}

	const start = Math.floor(fromMs / stepMs) * stepMs;
	const out: UsageTimelinePoint[] = [];
	for (let t = start; t <= toMs; t += stepMs) {
		const v = byEpoch.get(t) ?? { requests: 0, errors: 0 };
		out.push({ bucket: new Date(t).toISOString(), ...v });
	}
	return out;
}

function sumTokens(tokens: { [key: string]: number } | undefined): number {
	if (!tokens) return 0;
	let total = 0;
	for (const v of Object.values(tokens)) total += v;
	return total;
}

// --- Hooks ---

/**
 * Overview for the dashboard: KPIs + a ranked leaderboard for one dimension,
 * derived from the same summary query the detail table uses.
 */
export function useUsageOverview(groupBy: UsageGroupBy) {
	const { data } = useSuspenseQuery(usageSummaryQueryOptions(groupBy));
	const rows = data.rows ?? [];
	return {
		from: data.from,
		to: data.to,
		kpis: deriveKpis(rows),
		groups: deriveGroupStats(rows, groupBy),
	};
}

/**
 * Default relative window per bucket width, so the chart spans a clean, stable
 * range instead of the server's data-derived min/max. Picked to yield a
 * reasonable bucket count: 24 × 5m, 24 × 1h, 30 × 1d.
 */
export const DEFAULT_WINDOW: Record<UsageInterval, string> = {
	"5m": "2h",
	"1h": "24h",
	"1d": "30d",
};

const DURATION_UNIT_MS: Record<string, number> = {
	s: 1000,
	m: 60_000,
	h: 60 * 60_000,
	d: 24 * 60 * 60_000,
	w: 7 * 24 * 60 * 60_000,
};

/** Parse a relative window like "24h" / "30d" into milliseconds. */
function parseDurationMs(since: string): number | null {
	const match = /^(\d+)([smhdw])$/.exec(since.trim());
	if (!match) return null;
	return Number(match[1]) * DURATION_UNIT_MS[match[2]];
}

/**
 * Clock-aligned axis window for the chart: [now - since, now], snapped down to
 * the bucket boundary. We anchor the axis client-side rather than to the
 * server's from/to — the relay clamps `from` up to the earliest record, so a
 * data-pinned axis starts at a ragged timestamp (e.g. 4:35:12) instead of a
 * clean clock window.
 */
function clockWindow(
	interval: UsageInterval,
	since: string,
): { from: string; to: string } | null {
	const spanMs = parseDurationMs(since);
	if (spanMs == null) return null;
	const stepMs = INTERVAL_SECONDS[interval] * 1000;
	const now = Date.now();
	const from = Math.floor((now - spanMs) / stepMs) * stepMs;
	const to = Math.floor(now / stepMs) * stepMs;
	return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
}

/** Aggregate requests/errors per bucket across every group, for the overview chart. */
export function useUsageTimeline(
	interval: UsageInterval,
	since: string = DEFAULT_WINDOW[interval],
) {
	const { data } = useSuspenseQuery(
		usageTimeseriesQueryOptions(interval, "source", since),
	);
	// Prefer a clean client clock window; fall back to the server's range.
	const window = clockWindow(interval, since);
	const from = window?.from ?? data.from;
	const to = window?.to ?? data.to;
	return {
		from,
		to,
		interval,
		points: deriveTimeline(data.rows, from, to, interval),
	};
}

type UsageTimeseriesQuery = NonNullable<
	operations["usage_timeseries"]["parameters"]["query"]
>;

export function resourceTimelineQueryOptions(
	dimension: ResourceUsageDimension,
	id: string,
	interval: UsageInterval,
) {
	return queryOptions({
		queryKey: ["usage", "resource-timeline", dimension, id, interval] as const,
		queryFn: async (): Promise<UsageTimeSeriesResult> => {
			const query: UsageTimeseriesQuery = { interval, group_by: dimension };
			query[dimension] = [id];
			const { data, error } = await apiClient.GET("/usage/timeseries", {
				params: { query },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 15_000,
		gcTime: 5 * 60_000,
	});
}

/** Requests/errors over time scoped to one resource. */
export function useResourceTimeline(
	dimension: ResourceUsageDimension,
	id: string,
	interval: UsageInterval,
) {
	const { data } = useSuspenseQuery(
		resourceTimelineQueryOptions(dimension, id, interval),
	);
	return {
		from: data.from,
		to: data.to,
		interval,
		points: deriveTimeline(data.rows, data.from, data.to, interval),
	};
}
