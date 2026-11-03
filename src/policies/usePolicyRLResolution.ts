import { useMemo } from "react";
import { useBindings } from "@/api/hooks/bindings";
import { useHosts } from "@/api/hooks/hosts";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import { useRateLimits, useUsableRateLimits } from "@/api/hooks/ratelimits";
import type { RateLimit } from "@/api/types/ratelimit";
import { buildConcreteCatalog } from "@/lib/concreteCatalog";
import { displayLabel } from "@/lib/displayLabel";
import {
	type LabelLookups,
	type RefCoverage,
	resolveRateLimitScopes,
} from "@/lib/policyRLResolution";
import { formatRulesShort } from "@/lib/rateLimitFormat";
import type { RLMeta } from "@/rate-limits/AttachRateLimitModal";

export interface PolicyRLResolution {
	/** Per link, the coverage of each of its model-scope refs. */
	scopes: RefCoverage[][];
	labels: LabelLookups;
	rlMetaById: Map<string, RLMeta>;
	/** What the attach dialog offers: the rate limits the policy owner may link. */
	attachable: RLMeta[];
}

/** A policy's rate-limit links against the local catalog, RL metadata and
 * label lookups, for the edit picker's scope descriptions. `usableBy` is the
 * policy owner's scope as the list filter takes it. */
export function usePolicyRLResolution(
	links: readonly { rateLimitId: string; models: string[] }[],
	usableBy: string | undefined,
): PolicyRLResolution {
	const { data: providersData } = useProviders();
	const { data: modelsData } = useModels();
	const { data: hostsData } = useHosts();
	const { data: hostBindingsData } = useBindings();
	const { data: rateLimitsData } = useRateLimits();
	const usableRateLimits = useUsableRateLimits(usableBy).items;

	const concreteCatalog = useMemo(
		() =>
			buildConcreteCatalog({
				providers: providersData.items ?? [],
				models: modelsData.items ?? [],
				hosts: hostsData.items ?? [],
				bindings: hostBindingsData.items ?? [],
				includeDeprecated: true,
			}),
		[providersData, modelsData, hostsData, hostBindingsData],
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
				m.metadata.owner?.kind === "provider" ? m.metadata.owner.id : undefined;
			const provider = ownerId ? providerIdToSlug.get(ownerId) : undefined;
			if (!provider) continue;
			modelByKey.set(
				`${provider}/${m.metadata.name}`,
				displayLabel(m.metadata),
			);
		}
		return { providerByName, hostByName, modelByKey };
	}, [providersData, modelsData, hostsData]);

	const rlMetaById = useMemo(
		() => rateLimitMetas(rateLimitsData.items ?? []),
		[rateLimitsData],
	);

	// Linked ones stay listed so editing a link keeps its own rate limit.
	const attachable = [
		...rateLimitMetas(usableRateLimits).values(),
		...links.flatMap((l) => {
			const meta = rlMetaById.get(l.rateLimitId);
			return meta && !usableRateLimits.some((rl) => rl.metadata.id === meta.id)
				? [meta]
				: [];
		}),
	];

	const scopes = useMemo(
		() => resolveRateLimitScopes(links, concreteCatalog),
		[links, concreteCatalog],
	);

	return { scopes, labels, rlMetaById, attachable };
}

function rateLimitMetas(rateLimits: readonly RateLimit[]): Map<string, RLMeta> {
	const m = new Map<string, RLMeta>();
	for (const rl of rateLimits) {
		const id = rl.metadata.id;
		if (!id) continue;
		m.set(id, {
			id,
			label: displayLabel(rl.metadata),
			rules: formatRulesShort(rl.spec.rules),
		});
	}
	return m;
}
