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
) {
	return queryOptions({
		queryKey: ["usage", "timeseries", interval, groupBy] as const,
		queryFn: async (): Promise<UsageTimeSeriesResult> => {
			const { data, error } = await apiClient.GET("/usage/timeseries", {
				params: { query: { interval, group_by: groupBy } },
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

function deriveTimeline(
	rows: UsageTimeSeriesResult["rows"],
): UsageTimelinePoint[] {
	const byBucket = new Map<string, UsageTimelinePoint>();
	for (const series of rows ?? []) {
		for (const p of series.points ?? []) {
			const point = byBucket.get(p.bucket) ?? {
				bucket: p.bucket,
				requests: 0,
				errors: 0,
			};
			point.requests += p.requests;
			point.errors += p.error_count;
			byBucket.set(p.bucket, point);
		}
	}
	return [...byBucket.values()].sort((a, b) =>
		a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0,
	);
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

/** Aggregate requests/errors per bucket across every group, for the overview chart. */
export function useUsageTimeline(interval: UsageInterval) {
	const { data } = useSuspenseQuery(
		usageTimeseriesQueryOptions(interval, "source"),
	);
	return {
		from: data.from,
		to: data.to,
		interval,
		points: deriveTimeline(data.rows),
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
		points: deriveTimeline(data.rows),
	};
}
