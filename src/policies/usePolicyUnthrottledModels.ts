import { useMemo } from "react";
import { useBindings } from "@/api/hooks/bindings";
import { useHosts } from "@/api/hooks/hosts";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import {
	parseCatalogRef,
	refCovers,
	validateCatalogRef,
} from "@/lib/catalogRef";
import { buildConcreteCatalog } from "@/lib/concreteCatalog";
import { displayLabel } from "@/lib/displayLabel";

export interface UnthrottledModelRow {
	provider: string;
	model: string;
	modelLabel: string;
	/** Hosts where this model is unthrottled under the policy. */
	hosts: { slug: string; label: string }[];
}

export interface PolicyUnthrottledModelsResult {
	/** True when the policy has a default rate limit — nothing is unthrottled. */
	hasDefaultRateLimit: boolean;
	rows: UnthrottledModelRow[];
}

/**
 * Concrete (model, host) triples granted by the policy that no rate limit
 * binding (default or scoped) covers. If `policy.spec.rateLimitId` is set,
 * everything is covered → returns an empty list.
 */
export function usePolicyUnthrottledModels(
	policy: Policy,
): PolicyUnthrottledModelsResult {
	const { data: providers } = useProviders();
	const { data: models } = useModels();
	const { data: hostsData } = useHosts();
	const { data: bindingsData } = useBindings();

	return useMemo(() => {
		const hasDefaultRateLimit = !!policy.spec.rateLimitId;
		if (hasDefaultRateLimit) {
			return { hasDefaultRateLimit, rows: [] };
		}
		const grants = (policy.spec.models ?? [])
			.filter((g) => !validateCatalogRef(g))
			.map((g) => parseCatalogRef(g));
		if (grants.length === 0) {
			return { hasDefaultRateLimit, rows: [] };
		}
		const scopeRefsPerBinding = (policy.spec.rlBindings ?? []).map((b) =>
			(b.models ?? [])
				.filter((m) => !validateCatalogRef(m))
				.map((m) => parseCatalogRef(m)),
		);

		const catalog = buildConcreteCatalog({
			providers: providers.items ?? [],
			models: models.items ?? [],
			hosts: hostsData.items ?? [],
			bindings: bindingsData.items ?? [],
			includeDeprecated: policy.spec.includeDeprecated ?? false,
		});

		const modelByName = new Map<string, Model>();
		for (const m of models.items ?? []) modelByName.set(m.metadata.name, m);
		const hostBySlug = new Map<string, Host>();
		for (const h of hostsData.items ?? []) hostBySlug.set(h.metadata.name, h);

		// provider/model → set of host slugs that are unthrottled
		const acc = new Map<string, Set<string>>();
		for (const bnd of catalog) {
			const granted = grants.some((g) => refCovers(g, bnd));
			if (!granted) continue;
			const covered = scopeRefsPerBinding.some((scopes) =>
				scopes.some((s) => refCovers(s, bnd)),
			);
			if (covered) continue;
			const key = `${bnd.provider}/${bnd.model}`;
			const set = acc.get(key) ?? new Set<string>();
			set.add(bnd.host);
			acc.set(key, set);
		}

		const rows: UnthrottledModelRow[] = [];
		for (const [key, hostSlugs] of acc) {
			const [provider, model] = key.split("/") as [string, string];
			const m = modelByName.get(model);
			const modelLabel = m ? displayLabel(m.metadata) : model;
			const hosts = [...hostSlugs]
				.map((slug) => {
					const h = hostBySlug.get(slug);
					return { slug, label: h ? displayLabel(h.metadata) : slug };
				})
				.sort((a, b) => a.label.localeCompare(b.label));
			rows.push({ provider, model, modelLabel, hosts });
		}
		rows.sort(
			(a, b) =>
				a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model),
		);
		return { hasDefaultRateLimit, rows };
	}, [providers, models, hostsData, bindingsData, policy]);
}
