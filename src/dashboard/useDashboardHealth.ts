import { useQuery } from "@tanstack/react-query";
import {
	healthzQueryOptions,
	versionQueryOptions,
} from "@/api/queries/dashboard";

const BACKEND_LABELS: Record<string, string> = {
	pg: "Database",
	redis: "Session & rate-limit store",
};

export interface BackendHealth {
	key: string;
	label: string;
	ok: boolean;
}

/**
 * The control plane's own health: each backend it depends on, and the relay
 * version. Relays predating the control /healthz report no backends rather
 * than a false "all ok".
 */
export function useDashboardHealth(): {
	backends: BackendHealth[];
	/** Undefined when unknown (older relay, or not signed in). */
	masterKeyConfigured?: boolean;
	version?: string;
} {
	const { data: health } = useQuery(healthzQueryOptions);
	const { data: version } = useQuery(versionQueryOptions);
	return {
		backends: Object.entries(health?.backends ?? {}).map(([key, status]) => ({
			key,
			label: BACKEND_LABELS[key] ?? key,
			ok: status === "ok",
		})),
		masterKeyConfigured: health?.master_key_configured,
		version: version?.version,
	};
}
