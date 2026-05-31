import { useQuery } from "@tanstack/react-query";
import type { HealthStatusLevel } from "@/api/dashboard-types";
import {
	healthzQueryOptions,
	versionQueryOptions,
} from "@/api/queries/dashboard";

export interface HealthPill {
	key: string;
	label: string;
	status: HealthStatusLevel;
	error?: string;
}

const SUBSYSTEMS: {
	key: "catalog" | "state" | "eventlog" | "otel";
	label: string;
}[] = [
	{ key: "catalog", label: "Catalog" },
	{ key: "state", label: "State" },
	{ key: "eventlog", label: "Event log" },
	{ key: "otel", label: "OTel" },
];

/** Rank ok < degraded < error so the worst subsystem drives the overall pill. */
const RANK: Record<HealthStatusLevel, number> = {
	ok: 0,
	degraded: 1,
	error: 2,
};

/** Overall rollup phase: still loading, reachable+summarized, or unreachable. */
export type HealthPhase = "loading" | "ready" | "unavailable";

/**
 * Live health for the dashboard strip: subsystem statuses (polled every 5s via
 * `healthzQueryOptions`), the worst-of rollup, master-key state, and version.
 *
 * `/healthz` is served by the relay binary (same-origin/embedded). When the UI
 * runs against a control-plane-only API that doesn't expose it, the query 404s
 * and we report `phase: "unavailable"` — never a false "operational".
 */
export function useDashboardHealth() {
	const { data: health, isLoading, isError } = useQuery(healthzQueryOptions);
	const { data: version } = useQuery(versionQueryOptions);

	const subsystems: HealthPill[] = health
		? SUBSYSTEMS.map(({ key, label }) => ({
				key,
				label,
				status: health[key].status,
				error: health[key].error,
			}))
		: [];

	const phase: HealthPhase = health
		? "ready"
		: isError || !isLoading
			? "unavailable"
			: "loading";

	// Only meaningful when phase === "ready"; null otherwise so the UI can't
	// render a green "operational" without real subsystem data behind it.
	const overall: HealthStatusLevel | null =
		subsystems.length === 0
			? null
			: subsystems.reduce<HealthStatusLevel>(
					(worst, s) => (RANK[s.status] > RANK[worst] ? s.status : worst),
					"ok",
				);

	return {
		subsystems,
		overall,
		phase,
		masterKeyConfigured: health?.master_key_configured,
		version: version?.version,
	};
}
