import { useMemo } from "react";
import { bindingsByModel, useBindings } from "@/api/hooks/bindings";
import { useHosts } from "@/api/hooks/hosts";
import { usePolicies } from "@/api/hooks/policies";
import { useProviders } from "@/api/hooks/providers";
import { useRelayKeys } from "@/api/hooks/relayKeys";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import type { Provider } from "@/api/types/provider";
import {
	parseCatalogRef,
	refCovers,
	validateCatalogRef,
} from "@/lib/catalogRef";

export interface ModelHostRow {
	host: Host | undefined;
	hostId: string;
	/** Per-host snapshot allowlist; empty/null means this host serves every snapshot. */
	snapshots: readonly string[] | null;
	adapter: string;
	enabled: boolean;
	/** Pricing record id attached to this binding, if any. */
	pricingId: string | undefined;
	/** Upstream model name this binding maps to on the host. */
	upstreamName: string | undefined;
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
	const { data: bindingsData } = useBindings();

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

		const modelBindings =
			bindingsByModel(bindingsData.items ?? []).get(model.metadata.id ?? "") ??
			[];
		const hosts: ModelHostRow[] = modelBindings.map((b) => ({
			host: hostById.get(b.spec.hostId),
			hostId: b.spec.hostId,
			snapshots: b.spec.snapshots ?? null,
			adapter: b.spec.adapter,
			enabled: b.spec.enabled !== false,
			pricingId: b.spec.pricingId,
			upstreamName: b.spec.upstreamName,
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
				const matches = modelBindings.some((b) => {
					const h = hostById.get(b.spec.hostId);
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
	}, [
		model,
		providersData,
		hostsData,
		policiesData,
		relayKeysData,
		bindingsData,
	]);
}
