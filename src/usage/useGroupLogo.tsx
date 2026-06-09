import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useMemo } from "react";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { providersListQueryOptions } from "@/api/hooks/providers";
import type { UsageGroupBy } from "@/api/hooks/usage";
import type { Host } from "@/api/types/host";
import type { Provider } from "@/api/types/provider";
import { HostLogo } from "@/hosts/HostLogo";
import { ProviderLogo } from "@/providers/ProviderLogo";

/**
 * Resolves a usage `group` value to a brand logo when the dimension has one:
 * hosts and host-keys → the host's logo; models → their owning provider's logo.
 * Other dimensions (policy, relay key, source) have no logo and return null, so
 * the caller can fall back to a colored swatch. Only the list(s) the current
 * dimension needs are fetched, lazily; returns null until they resolve.
 */
export function useGroupLogo(
	groupBy: UsageGroupBy,
	size = 18,
): (key: string) => ReactNode {
	const needsHosts = groupBy === "host_id" || groupBy === "host_key_id";
	const needsHostKeys = groupBy === "host_key_id";
	const needsModels = groupBy === "model_id";

	const hosts = useQuery({ ...hostsListQueryOptions, enabled: needsHosts });
	const hostKeys = useQuery({
		...hostKeysListQueryOptions,
		enabled: needsHostKeys,
	});
	const models = useQuery({ ...modelsListQueryOptions, enabled: needsModels });
	const providers = useQuery({
		...providersListQueryOptions,
		enabled: needsModels,
	});

	return useMemo(() => {
		const hostById = new Map<string, Host>();
		for (const h of hosts.data?.items ?? [])
			if (h.metadata.id) hostById.set(h.metadata.id, h);

		const providerById = new Map<string, Provider>();
		for (const p of providers.data?.items ?? [])
			if (p.metadata.id) providerById.set(p.metadata.id, p);

		const hostIdByKey = new Map<string, string>();
		for (const hk of hostKeys.data?.items ?? [])
			if (hk.metadata.id) hostIdByKey.set(hk.metadata.id, hk.spec.hostId);

		const providerIdByModel = new Map<string, string>();
		for (const m of models.data?.items ?? []) {
			if (!m.metadata.id) continue;
			if (m.metadata.owner?.kind === "provider" && m.metadata.owner.id)
				providerIdByModel.set(m.metadata.id, m.metadata.owner.id);
		}

		return (key: string): ReactNode => {
			if (groupBy === "host_id") {
				const h = hostById.get(key);
				return h ? <HostLogo host={h} size={size} /> : null;
			}
			if (groupBy === "host_key_id") {
				const h = hostById.get(hostIdByKey.get(key) ?? "");
				return h ? <HostLogo host={h} size={size} /> : null;
			}
			if (groupBy === "model_id") {
				const p = providerById.get(providerIdByModel.get(key) ?? "");
				return p ? <ProviderLogo provider={p} size={size} /> : null;
			}
			return null;
		};
	}, [groupBy, size, hosts.data, hostKeys.data, models.data, providers.data]);
}
