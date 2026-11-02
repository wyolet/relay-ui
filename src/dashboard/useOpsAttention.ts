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
import {
	usageSummaryQueryOptions,
	useRolling24hWindow,
} from "@/api/hooks/usage";
import { displayLabel } from "@/lib/displayLabel";
import { type RefusalCount, refusalCounts } from "@/lib/refusal";
import {
	type BreakerStatus,
	breakerAttention,
	degradedHosts,
	type HostErrorStat,
} from "@/lib/usage-math/ops";

/** How often the operations block re-polls its live signals. */
const OPS_REFETCH_MS = 30_000;

/** Statuses no refusal covers: a missing or bad credential. Also the
 * panel's deep link, so logs show the slice that was counted. */
export const UNAUTHENTICATED_STATUSES = [401];

/**
 * Requests rejected over the trailing 24h: those relay refused itself, by
 * refusal, and unauthenticated ones. Refusals already hold relay's 429s and
 * policy 403s, so the status count stays at 401 to avoid counting a request
 * twice; an upstream's own 4xx shows in its host's failure rate.
 */
export function useRejections(): {
	refusals: RefusalCount[];
	unauthenticated: number;
} {
	const win = useRolling24hWindow();
	const [refused, unauthenticated] = useSuspenseQueries({
		queries: [
			{
				...usageSummaryQueryOptions("refusal", win),
				refetchInterval: OPS_REFETCH_MS,
			},
			{
				...usageSummaryQueryOptions("source", win, {
					status: UNAUTHENTICATED_STATUSES,
				}),
				refetchInterval: OPS_REFETCH_MS,
			},
		],
	});
	return {
		refusals: refusalCounts(refused.data.rows ?? []),
		unauthenticated: (unauthenticated.data.rows ?? []).reduce(
			(n, r) => n + r.requests,
			0,
		),
	};
}

/** Hosts over the degraded thresholds in the trailing 24h, worst first. */
export function useDegradedHosts(): HostErrorStat[] {
	const win = useRolling24hWindow();
	const { data } = useSuspenseQuery({
		...usageSummaryQueryOptions("host_id", win),
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
