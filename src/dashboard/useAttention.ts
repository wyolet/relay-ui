import { useQuery } from "@tanstack/react-query";
import { useDeniedAuditCount } from "@/api/hooks/audit";
import { useCostKpi } from "@/api/hooks/cost";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { resolveWindow, useRolling24hWindow } from "@/api/hooks/usage";
import { displayLabel } from "@/lib/displayLabel";
import { fmtCompact, fmtPct } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import { useDashboardHealth } from "./useDashboardHealth";
import {
	useBreakerHealth,
	useDegradedHosts,
	useRejections,
} from "./useOpsAttention";

/** Where an attention line leads; the component maps it to a link. */
export type AttentionTarget =
	| { kind: "none" }
	| { kind: "hostKey"; name: string }
	| { kind: "hostErrors"; hostId: string }
	| { kind: "throttled" }
	| { kind: "refused" }
	| { kind: "denied" }
	| { kind: "pricing" }
	| { kind: "key"; name: string };

export interface AttentionItem {
	key: string;
	tone: "alert" | "warn";
	text: string;
	target: AttentionTarget;
}

const EXPIRY_HORIZON_MS = 7 * 24 * 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/** Everything an operator should act on, worst first; empty means all clear.
 * Traffic problems cover the last 24h, unpriced spend this week. */
export function useAttention(): { items: AttentionItem[]; checking: boolean } {
	const health = useDashboardHealth();
	const breakers = useBreakerHealth();
	const hosts = useDegradedHosts();
	const hostLabel = useGroupLabeler("host_id");
	const { buckets } = useRejections();
	const denied = useDeniedAuditCount(useRolling24hWindow().from);
	const cost = useCostKpi(resolveWindow("week"));
	const { data: keyList } = useQuery(keysListQueryOptions);

	const items: AttentionItem[] = [];
	for (const b of health.backends) {
		if (b.ok) continue;
		items.push({
			key: `backend-${b.key}`,
			tone: "alert",
			text: `${b.label} is down`,
			target: { kind: "none" },
		});
	}
	if (health.masterKeyConfigured === false) {
		items.push({
			key: "master-key",
			tone: "warn",
			text: "No master key configured",
			target: { kind: "none" },
		});
	}
	for (const k of breakers.attention) {
		items.push({
			key: `breaker-${k.id}`,
			tone: k.state === "open" ? "alert" : "warn",
			text: `${k.label}: breaker ${k.state === "open" ? "open" : "half-open"}${k.reason ? `, ${k.reason}` : ""}`,
			target: { kind: "hostKey", name: k.name },
		});
	}
	for (const h of hosts) {
		items.push({
			key: `host-${h.key}`,
			tone: "alert",
			text: `${hostLabel(h.key)} failing ${fmtPct(h.errorRate)} of requests`,
			target: { kind: "hostErrors", hostId: h.key },
		});
	}
	if (buckets.throttled > 0) {
		items.push({
			key: "throttled",
			tone: "warn",
			text: `${fmtCompact(buckets.throttled)} requests throttled (429)`,
			target: { kind: "throttled" },
		});
	}
	if (buckets.auth > 0) {
		items.push({
			key: "refused",
			tone: "warn",
			text: `${fmtCompact(buckets.auth)} requests refused (401, 403)`,
			target: { kind: "refused" },
		});
	}
	if (denied && denied.events > 0) {
		items.push({
			key: "denied",
			tone: "warn",
			text: `${fmtCompact(denied.events)}${denied.truncated ? "+" : ""} control-plane requests denied`,
			target: { kind: "denied" },
		});
	}
	if (cost.current.unpricedEvents > 0) {
		items.push({
			key: "unpriced",
			tone: "warn",
			text: `${fmtCompact(cost.current.unpricedEvents)} requests unpriced this week`,
			target: { kind: "pricing" },
		});
	}
	const now = Date.now();
	for (const k of keyList?.items ?? []) {
		const expires = k.spec.expiresAt ? Date.parse(k.spec.expiresAt) : NaN;
		if (k.spec.revokedAt || Number.isNaN(expires)) continue;
		const left = expires - now;
		if (left <= 0 || left > EXPIRY_HORIZON_MS) continue;
		const days = Math.ceil(left / DAY_MS);
		items.push({
			key: `expiring-${k.metadata.name}`,
			tone: "warn",
			text: `Key ${displayLabel(k.metadata)} expires in ${days} day${days === 1 ? "" : "s"}`,
			target: { kind: "key", name: k.metadata.name },
		});
	}

	items.sort((a, b) => Number(b.tone === "alert") - Number(a.tone === "alert"));
	return { items, checking: breakers.pending };
}
