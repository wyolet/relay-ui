import { useQuery } from "@tanstack/react-query";
import { useDeniedAuditCount } from "@/api/hooks/audit";
import { useCostKpi } from "@/api/hooks/cost";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { usePlanIssues } from "@/api/hooks/planIssues";
import { resolveWindow, useRolling24hWindow } from "@/api/hooks/usage";
import type { ObjectRoute } from "@/diagnostics/objectRoutes";
import { displayLabel } from "@/lib/displayLabel";
import { type Refusal, refusalLabel } from "@/lib/refusal";
import { fmtCompact, fmtPct } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import { planIssueAttention } from "./planIssueAttention";
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
	| { kind: "refusal"; refusal: Refusal }
	| { kind: "unauthenticated" }
	| { kind: "denied" }
	| { kind: "pricing" }
	| { kind: "key"; name: string }
	| { kind: "object"; to: ObjectRoute; name: string };

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
	const rejections = useRejections();
	const denied = useDeniedAuditCount(useRolling24hWindow().from);
	const cost = useCostKpi(resolveWindow("week"));
	const { data: keyList } = useQuery(keysListQueryOptions);
	const planIssues = usePlanIssues();

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
	for (const r of rejections.refusals) {
		items.push({
			key: `refusal-${r.refusal}`,
			tone: "warn",
			text: `${fmtCompact(r.requests)} requests refused: ${refusalLabel(r.refusal).toLowerCase()}`,
			target: { kind: "refusal", refusal: r.refusal },
		});
	}
	if (rejections.unauthenticated > 0) {
		items.push({
			key: "unauthenticated",
			tone: "warn",
			text: `${fmtCompact(rejections.unauthenticated)} requests unauthenticated (401)`,
			target: { kind: "unauthenticated" },
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

	items.push(...planIssueAttention(planIssues));

	items.sort((a, b) => Number(b.tone === "alert") - Number(a.tone === "alert"));
	return { items, checking: breakers.pending };
}
