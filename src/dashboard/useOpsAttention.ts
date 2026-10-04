import {
	useQueries,
	useQuery,
	useSuspenseQueries,
	useSuspenseQuery,
} from "@tanstack/react-query";
import {
	hostKeyHealthQueryOptions,
	hostKeysListQueryOptions,
} from "@/api/hooks/hostkeys";
import { rolling24hWindow, usageSummaryQueryOptions } from "@/api/hooks/usage";
import { displayLabel } from "@/lib/displayLabel";
import {
	type BreakerStatus,
	breakerAttention,
	degradedHosts,
	type HostErrorStat,
	type RejectionBuckets,
	rejectionBuckets,
	type VolumeLeader,
	volumeLeaders,
} from "@/lib/usage-math/ops";

/** How often the operations block re-polls its live signals. */
const OPS_REFETCH_MS = 30_000;

/** Exact statuses behind the "auth" rejection bucket — also used by the
 * panel's deep link so logs show the same slice that was counted. */
export const AUTH_STATUSES = [401, 403];
export const THROTTLED_STATUSES = [429];

/**
 * Rejected (4xx) traffic over the trailing 24h: total volume split into
 * throttled / auth / other buckets, plus the keys catching the most
 * rejections. Three summary calls against the same window — one grouped by
 * key for the leaderboard, two ungrouped slices for the bucket counts.
 * Note a 429 can be relay-issued (our rate limit) or an upstream 429 passed
 * through; `error_kind` could split those once the relay enumerates its
 * values, but the combined count is the honest aggregate today.
 */
export function useRejections(): {
	buckets: RejectionBuckets;
	topKeys: VolumeLeader[];
} {
	const win = rolling24hWindow();
	const [all, throttled, auth] = useSuspenseQueries({
		queries: [
			{
				...usageSummaryQueryOptions("relay_key_hash", win, {
					status_class: "4xx",
				}),
				refetchInterval: OPS_REFETCH_MS,
			},
			{
				...usageSummaryQueryOptions("source", win, {
					status: THROTTLED_STATUSES,
				}),
				refetchInterval: OPS_REFETCH_MS,
			},
			{
				...usageSummaryQueryOptions("source", win, { status: AUTH_STATUSES }),
				refetchInterval: OPS_REFETCH_MS,
			},
		],
	});
	const byKey = volumeLeaders(all.data.rows ?? [], "relay_key_hash");
	return {
		buckets: rejectionBuckets(
			byKey.total,
			volumeLeaders(throttled.data.rows ?? [], "source").total,
			volumeLeaders(auth.data.rows ?? [], "source").total,
		),
		topKeys: byKey.top,
	};
}

/** Hosts over the degraded thresholds in the trailing 24h, worst first. */
export function useDegradedHosts(): HostErrorStat[] {
	const { data } = useSuspenseQuery({
		...usageSummaryQueryOptions("host_id", rolling24hWindow()),
		refetchInterval: OPS_REFETCH_MS,
	});
	const stats = (data.rows ?? []).map((r) => ({
		key: r.group?.host_id?.trim() || "—",
		requests: r.requests,
		errorCount: r.error_count,
		errorRate: r.requests > 0 ? r.error_count / r.requests : 0,
	}));
	return degradedHosts(stats);
}

/** A tripped breaker joined with the key's identity, for linking/labels. */
export interface BreakerRow extends BreakerStatus {
	/** Route param for /host-keys/$name. */
	name: string;
}

/**
 * Circuit-breaker status across the whole host-key fleet (one /health call per
 * key — there is no bulk endpoint). Non-suspense so the panel renders as
 * results trickle in; keys still loading are treated as healthy until proven
 * otherwise, `pending` lets the UI say "checking" instead of "all healthy".
 */
export function useBreakerHealth(): {
	pending: boolean;
	keysChecked: number;
	attention: BreakerRow[];
} {
	const { data: list } = useQuery(hostKeysListQueryOptions);
	// The server always assigns ids to persisted keys; the guard is for the type.
	const keys = (list?.items ?? []).flatMap((k) =>
		k.metadata.id !== undefined
			? [
					{
						id: k.metadata.id,
						name: k.metadata.name,
						label: displayLabel(k.metadata),
					},
				]
			: [],
	);
	const results = useQueries({
		queries: keys.map((k) => hostKeyHealthQueryOptions(k.id)),
	});

	const statuses = keys.flatMap((k, i) => {
		const health = results[i]?.data;
		if (!health) return [];
		return [
			{
				...k,
				state: health.state,
				indefinite: health.indefinite,
				reason: health.reason,
				cooldownRemainingSeconds: health.cooldown_remaining_seconds,
			},
		];
	});

	return {
		pending: !list || results.some((r) => r.isPending),
		keysChecked: keys.length,
		attention: breakerAttention(statuses),
	};
}
