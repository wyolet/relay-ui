import { useMemo } from "react";
import { useHostKeys } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import {
	type CatalogRef,
	type ConcreteBinding,
	parseCatalogRef,
	refCovers,
	validateCatalogRef,
} from "@/lib/catalogRef";
import { buildConcreteCatalog } from "@/lib/concreteCatalog";

export interface HostRequirement {
	host: Host;
	hostKeys: HostKey[];
	selectedKeyId: string | undefined;
	/** Refs (raw strings) that this host is a candidate for. */
	contributingRefs: string[];
}

export interface HostRequirementGroup {
	/** Raw ref string that produced this group. */
	ref: string;
	/** "required" = exactly one candidate host (or host-anchored ref); operator must pick its key. */
	/** "optional" = ref expands to multiple candidate hosts; one key from any candidate suffices. */
	kind: "required" | "optional";
	candidateHostIds: string[];
}

export interface PolicyHostRequirements {
	groups: HostRequirementGroup[];
	hosts: Map<string, HostRequirement>;
	/** Refs that couldn't resolve to any catalog binding (dead refs). */
	unresolvedRefs: string[];
	/** Any selected hostKeyId whose host isn't required by current refs. */
	extraSelectedKeyIds: string[];
}

/**
 * Derive which hosts the selected catalog refs imply need a host-key,
 * given the local catalog. Pure derivation against cached data —
 * never calls /catalog/resolve.
 */
export function usePolicyHostRequirements(
	refs: readonly string[],
	selectedHostKeyIds: readonly string[],
	includeDeprecated: boolean,
): PolicyHostRequirements {
	const { data: providers } = useProviders();
	const { data: models } = useModels();
	const { data: hostsData } = useHosts();
	const { data: hostKeysData } = useHostKeys();

	return useMemo(
		() =>
			derive({
				refs,
				selectedHostKeyIds,
				providers: providers.items ?? [],
				models: models.items ?? [],
				hosts: hostsData.items ?? [],
				hostKeys: hostKeysData.items ?? [],
				includeDeprecated,
			}),
		[
			refs,
			selectedHostKeyIds,
			providers,
			models,
			hostsData,
			hostKeysData,
			includeDeprecated,
		],
	);
}

function derive(input: {
	refs: readonly string[];
	selectedHostKeyIds: readonly string[];
	providers: Parameters<typeof buildConcreteCatalog>[0]["providers"];
	models: Parameters<typeof buildConcreteCatalog>[0]["models"];
	hosts: readonly Host[];
	hostKeys: readonly HostKey[];
	includeDeprecated: boolean;
}): PolicyHostRequirements {
	const catalog: ConcreteBinding[] = buildConcreteCatalog({
		providers: input.providers,
		models: input.models,
		hosts: input.hosts,
		includeDeprecated: input.includeDeprecated,
	});

	const hostBySlug = new Map<string, Host>();
	const hostIdBySlug = new Map<string, string>();
	for (const h of input.hosts) {
		hostBySlug.set(h.metadata.name, h);
		if (h.metadata.id) hostIdBySlug.set(h.metadata.name, h.metadata.id);
	}

	const keysByHostId = new Map<string, HostKey[]>();
	for (const k of input.hostKeys) {
		const list = keysByHostId.get(k.spec.hostId) ?? [];
		list.push(k);
		keysByHostId.set(k.spec.hostId, list);
	}

	const groups: HostRequirementGroup[] = [];
	const hosts = new Map<string, HostRequirement>();
	const unresolvedRefs: string[] = [];
	const requiredHostIds = new Set<string>();

	for (const raw of input.refs) {
		if (validateCatalogRef(raw)) continue;
		let parsed: CatalogRef;
		try {
			parsed = parseCatalogRef(raw);
		} catch {
			continue;
		}

		// Host slugs this ref grants, derived against the local catalog.
		const candidateHostSlugs = new Set<string>();

		// Host-anchored refs: trust the segment directly. Catches the case where
		// a ref names a host that has zero bindings yet — operator still needs
		// the key to exist for when bindings appear.
		if (parsed.host !== undefined) {
			candidateHostSlugs.add(parsed.host);
		} else {
			for (const bnd of catalog) {
				if (refCovers(parsed, bnd)) candidateHostSlugs.add(bnd.host);
			}
		}

		if (candidateHostSlugs.size === 0) {
			unresolvedRefs.push(raw);
			continue;
		}

		const candidateHostIds: string[] = [];
		for (const slug of candidateHostSlugs) {
			const id = hostIdBySlug.get(slug);
			if (!id) continue;
			candidateHostIds.push(id);

			if (!hosts.has(id)) {
				const host = hostBySlug.get(slug);
				if (!host) continue;
				hosts.set(id, {
					host,
					hostKeys: keysByHostId.get(id) ?? [],
					selectedKeyId: pickSelected(
						keysByHostId.get(id) ?? [],
						input.selectedHostKeyIds,
					),
					contributingRefs: [],
				});
			}
			hosts.get(id)?.contributingRefs.push(raw);
		}

		const kind: HostRequirementGroup["kind"] =
			candidateHostIds.length === 1 ? "required" : "optional";
		if (kind === "required" && candidateHostIds[0]) {
			requiredHostIds.add(candidateHostIds[0]);
		}
		groups.push({ ref: raw, kind, candidateHostIds });
	}

	const requiredHostIdSet = new Set<string>();
	for (const id of requiredHostIds) requiredHostIdSet.add(id);

	const extraSelectedKeyIds: string[] = [];
	for (const keyId of input.selectedHostKeyIds) {
		const key = input.hostKeys.find((k) => k.metadata.id === keyId);
		if (!key) continue;
		if (!hosts.has(key.spec.hostId)) extraSelectedKeyIds.push(keyId);
	}

	return { groups, hosts, unresolvedRefs, extraSelectedKeyIds };
}

function pickSelected(
	keys: readonly HostKey[],
	selected: readonly string[],
): string | undefined {
	const sel = new Set(selected);
	for (const k of keys) {
		if (k.metadata.id && sel.has(k.metadata.id)) return k.metadata.id;
	}
	return undefined;
}
