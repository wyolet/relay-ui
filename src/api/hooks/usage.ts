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
