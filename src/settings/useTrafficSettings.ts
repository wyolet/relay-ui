import { useQuery } from "@tanstack/react-query";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import {
	proxyModeQueryOptions,
	useUpdateProxyMode,
} from "@/api/hooks/settings";
import { useSettingSave } from "@/settings/useSettingSave";

/** Proxy mode's two switches and the relay's own API limits. */
export function useTrafficSettings() {
	const proxy = useQuery({ ...proxyModeQueryOptions, retry: false });
	const limits = useQuery({ ...rateLimitsListQueryOptions, retry: false });
	const save = useSettingSave(
		useUpdateProxyMode(),
		"Failed to update proxy mode.",
	);

	const value = proxy.data?.value;
	// The relay's API throttles are its system-owned rate limits.
	const system = (limits.data?.items ?? []).filter(
		(rl) => rl.metadata.owner?.kind === "system",
	);
	const on = system.filter((rl) => rl.spec.enabled !== false).length;
	return {
		proxyOn: value?.enabled,
		unauthenticatedOn: value?.allowUnauthenticated,
		setProxyOn: (next: boolean) =>
			value &&
			save.save(
				{ ...value, enabled: next },
				`Proxy mode ${next ? "on" : "off"}`,
				"proxy-mode",
			),
		setUnauthenticatedOn: (next: boolean) =>
			value &&
			save.save(
				{ ...value, allowUnauthenticated: next },
				next ? "Unauthenticated proxy allowed" : "Proxy requests need a key",
				"proxy-unauthenticated",
			),
		pending: save.pending,
		apiLimits: limits.data ? `${on} of ${system.length} on` : undefined,
	};
}
