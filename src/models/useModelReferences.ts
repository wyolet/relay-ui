import { useMemo } from "react";
import { useHosts } from "@/api/hooks/hosts";
import { usePolicies } from "@/api/hooks/policies";
import { useProviders } from "@/api/hooks/providers";
import { useRelayKeys } from "@/api/hooks/relayKeys";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import type { Provider } from "@/api/types/provider";
import { parseCatalogRef, refCovers, validateCatalogRef } from "@/lib/catalogRef";

export interface ModelHostRow {
	host: Host | undefined;
	hostId: string;
	upstreamName: string;
	adapter: string;
	enabled: boolean;
}

export interface ModelPolicyRow {
	policy: Policy;
	/** The raw catalog refs from policy.spec.models that cover this model. */
	matchingRefs: string[];
	relayKeyCount: number;
	enabled: boolean;
	hostOwned: boolean;
}

export interface ModelReferences {
	provider: Provider | undefined;
	providerSlug: string;
	hosts: ModelHostRow[];
	policies: ModelPolicyRow[];
}

/**
 * Per-model derivation: which hosts serve it (joined from spec.hosts[]) and
 * which user policies grant it (catalog-ref reverse match). Pure read over
 * the four global lists — no extra fetch.
 */
export function useModelReferences(model: Model): ModelReferences {
	const { data: providersData } = useProviders();
	const { data: hostsData } = useHosts();
	const { data: policiesData } = usePolicies();
	const { data: relayKeysData } = useRelayKeys();

	return useMemo(() => {
		const ownerId =
			model.metadata.owner?.kind === "provider"
				? (model.metadata.owner.id ?? "")
				: "";
		const provider = (providersData.items ?? []).find(
			(p) => p.metadata.id === ownerId,
		);
		const providerSlug = provider?.metadata.name ?? "";

		const hostBySlug = new Map<string, Host>();
		const hostById = new Map<string, Host>();
		for (const h of hostsData.items ?? []) {
			hostBySlug.set(h.metadata.name, h);
			if (h.metadata.id) hostById.set(h.metadata.id, h);
		}

		const hosts: ModelHostRow[] = (model.spec.hosts ?? []).map((b) => ({
			host: hostById.get(b.hostId),
			hostId: b.hostId,
			upstreamName: b.upstreamName,
			adapter: b.adapter,
			enabled: b.enabled !== false,
		}));

		const relayKeyCountByPolicy = new Map<string, number>();
		for (const rk of relayKeysData.items ?? []) {
			const pid = rk.spec.policyId;
			if (!pid) continue;
			relayKeyCountByPolicy.set(pid, (relayKeyCountByPolicy.get(pid) ?? 0) + 1);
		}

		const policies: ModelPolicyRow[] = [];
		for (const p of policiesData.items ?? []) {
			const refs = p.spec.models ?? [];
			const matchingRefs: string[] = [];
			for (const raw of refs) {
				if (validateCatalogRef(raw)) continue;
				const parsed = parseCatalogRef(raw);
				// Check whether the ref covers ANY of this model's host bindings.
				const matches = (model.spec.hosts ?? []).some((b) => {
					const h = hostById.get(b.hostId);
					if (!h) return false;
					return refCovers(parsed, {
						provider: providerSlug,
						model: model.metadata.name,
						host: h.metadata.name,
					});
				});
				if (matches) matchingRefs.push(raw);
			}
			if (matchingRefs.length === 0) continue;
			const id = p.metadata.id;
			policies.push({
				policy: p,
				matchingRefs,
				relayKeyCount: id ? (relayKeyCountByPolicy.get(id) ?? 0) : 0,
				enabled: p.spec.enabled !== false,
				hostOwned: p.metadata.owner?.kind === "host",
			});
		}

		return { provider, providerSlug, hosts, policies };
	}, [model, providersData, hostsData, policiesData, relayKeysData]);
}
