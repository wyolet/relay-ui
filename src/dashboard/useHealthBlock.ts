import { useLatencyProfile, useUsageOverview } from "@/api/hooks/usage";
import { slowestGroup } from "@/lib/usage-math/latency";
import type { Fact } from "@/shared/Facts";
import type { RankRow } from "@/shared/RankList";
import { fmtCompact, fmtMs, fmtPct } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import { useDashboardWindow } from "./useDashboardWindow";

/** Usage rows whose model the relay never resolved. */
const UNSET_KEY = "—";

export interface HealthBlock {
	period: string;
	/** The logs window that covers the period. */
	since: "7d" | "30d";
	latency: RankRow[];
	/** "slowest request 392.8 s"; empty without timed requests. */
	latencyNote: string;
	errorRate: string;
	requests: string;
	/** Error counts by kind: 5xx, 4xx, throttled. */
	errorKinds: Fact[];
	slowest: { modelId: string; label: string; p95: string } | null;
}

/** How the period's traffic behaved: latency percentiles, errors by kind and
 * the model that answered slowest. */
export function useHealthBlock(): HealthBlock {
	const { win, period, range, filter } = useDashboardWindow();
	const profile = useLatencyProfile(win, filter);
	const { kpis, groups, labels } = useUsageOverview("model_id", win, filter);
	const labelFor = useGroupLabeler("model_id", labels);

	const slow = slowestGroup(
		groups
			.filter((g) => g.key !== UNSET_KEY)
			.map((g) => ({ ...g, p95: g.duration.p95 })),
	);
	const clientOnly = Math.max(kpis.clientErrors - kpis.throttled, 0);

	return {
		period,
		since: range === "month" ? "30d" : "7d",
		latency: (profile?.ladder ?? []).map((r) => ({
			key: r.label,
			label: r.label,
			share: r.share,
			value: fmtMs(r.ms),
		})),
		latencyNote: profile ? `slowest request ${fmtMs(profile.maxMs)}` : "",
		errorRate: fmtPct(kpis.errorRate),
		requests: fmtCompact(kpis.requests),
		errorKinds: [
			{ label: "5xx", value: fmtCompact(kpis.serverErrors) },
			{ label: "4xx", value: fmtCompact(clientOnly) },
			{ label: "Throttled", value: fmtCompact(kpis.throttled) },
		],
		slowest: slow
			? {
					modelId: slow.key,
					label: labelFor(slow.key),
					p95: fmtMs(slow.p95),
				}
			: null,
	};
}
