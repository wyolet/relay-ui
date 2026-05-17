import { useMemo } from "react";
import { useHosts } from "@/api/hooks/hosts";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import { useRateLimits } from "@/api/hooks/ratelimits";
import { buildConcreteCatalog } from "@/lib/concreteCatalog";
import { displayLabel } from "@/lib/displayLabel";
import {
	type LabelLookups,
	resolveBindings,
	type Resolution,
} from "@/lib/policyRLResolution";
import { formatRulesShort } from "@/lib/rateLimitFormat";
import type { RLMeta } from "@/rate-limits/AttachRateLimitModal";

export interface PolicyRLResolution {
	resolution: Resolution;
	labels: LabelLookups;
	rlMetaById: Map<string, RLMeta>;
}

/**
 * Shared resolution for a policy's rate-limit bindings: combines the local
 * catalog, RL metadata, and label lookups. Drives both the edit picker's
 * specificity hints and the detail page's overlap warning.
 */
export function usePolicyRLResolution(
	bindings: readonly { rateLimitId: string; models: string[] }[],
	includeDeprecated: boolean,
): PolicyRLResolution {
	const { data: providersData } = useProviders();
	const { data: modelsData } = useModels();
	const { data: hostsData } = useHosts();
	const { data: rateLimitsData } = useRateLimits();

	const concreteCatalog = useMemo(
		() =>
			buildConcreteCatalog({
				providers: providersData.items ?? [],
				models: modelsData.items ?? [],
				hosts: hostsData.items ?? [],
				includeDeprecated,
			}),
		[providersData, modelsData, hostsData, includeDeprecated],
	);

	const labels = useMemo<LabelLookups>(() => {
		const providerByName = new Map<string, string>();
		for (const p of providersData.items ?? []) {
			providerByName.set(p.metadata.name, displayLabel(p.metadata));
		}
		const hostByName = new Map<string, string>();
		for (const h of hostsData.items ?? []) {
			hostByName.set(h.metadata.name, displayLabel(h.metadata));
		}
		const modelByKey = new Map<string, string>();
		const providerIdToSlug = new Map<string, string>();
		for (const p of providersData.items ?? []) {
			if (p.metadata.id) providerIdToSlug.set(p.metadata.id, p.metadata.name);
		}
		for (const m of modelsData.items ?? []) {
			const ownerId =
				m.metadata.owner?.kind === "provider"
					? m.metadata.owner.id
					: undefined;
			const provider = ownerId ? providerIdToSlug.get(ownerId) : undefined;
			if (!provider) continue;
			modelByKey.set(
				`${provider}/${m.metadata.name}`,
				displayLabel(m.metadata),
			);
		}
		return { providerByName, hostByName, modelByKey };
	}, [providersData, modelsData, hostsData]);

	const rlMetaById = useMemo(() => {
		const m = new Map<string, RLMeta>();
		for (const rl of rateLimitsData.items ?? []) {
			const id = rl.metadata.id;
			if (!id) continue;
			m.set(id, {
				id,
				label: displayLabel(rl.metadata),
				rules: formatRulesShort(rl.spec.rules),
			});
		}
		return m;
	}, [rateLimitsData]);

	const resolution = useMemo(
		() => resolveBindings(bindings, concreteCatalog),
		[bindings, concreteCatalog],
	);

	return { resolution, labels, rlMetaById };
}
