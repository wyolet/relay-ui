import { useMemo } from "react";
import { useHosts } from "@/api/hooks/hosts";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import type { Host } from "@/api/types/host";
import type { Policy } from "@/api/types/policy";
import {
	type ConcreteBinding,
	parseCatalogRef,
	refCovers,
	validateCatalogRef,
} from "@/lib/catalogRef";
import { buildConcreteCatalog } from "@/lib/concreteCatalog";

export interface PolicyResolvedCatalog {
	/** Unique (provider/model) pairs granted by the policy refs. */
	modelCount: number;
	/** Unique provider slugs touched by grants. */
	providerCount: number;
	/** Hosts that serve at least one granted model, ordered by model count desc. */
	hosts: { host: Host; modelCount: number }[];
}

export function usePolicyResolvedCatalog(
	policy: Policy,
): PolicyResolvedCatalog {
	const { data: providers } = useProviders();
	const { data: models } = useModels();
	const { data: hostsData } = useHosts();

	return useMemo(() => {
		const catalog: ConcreteBinding[] = buildConcreteCatalog({
			providers: providers.items ?? [],
			models: models.items ?? [],
			hosts: hostsData.items ?? [],
			includeDeprecated: policy.spec.includeDeprecated ?? false,
		});
		const hostBySlug = new Map<string, Host>();
		for (const h of hostsData.items ?? []) hostBySlug.set(h.metadata.name, h);

		const grants = policy.spec.models ?? [];
		const granted = new Set<string>();
		for (const raw of grants) {
			if (validateCatalogRef(raw)) continue;
			const parsed = parseCatalogRef(raw);
			for (const b of catalog) {
				if (refCovers(parsed, b)) {
					granted.add(`${b.provider}/${b.model}@${b.host}`);
				}
			}
		}

		const modelPairs = new Set<string>();
		const providerSet = new Set<string>();
		const byHost = new Map<string, number>();
		for (const key of granted) {
			const [pm, host] = key.split("@");
			if (!pm || !host) continue;
			modelPairs.add(pm);
			const [provider] = pm.split("/");
			if (provider) providerSet.add(provider);
			byHost.set(host, (byHost.get(host) ?? 0) + 1);
		}

		const hosts = Array.from(byHost.entries())
			.map(([slug, modelCount]) => {
				const host = hostBySlug.get(slug);
				return host ? { host, modelCount } : null;
			})
			.filter((x): x is { host: Host; modelCount: number } => x !== null)
			.sort((a, b) => b.modelCount - a.modelCount);

		return {
			modelCount: modelPairs.size,
			providerCount: providerSet.size,
			hosts,
		};
	}, [providers, models, hostsData, policy.spec.models, policy.spec.includeDeprecated]);
}
