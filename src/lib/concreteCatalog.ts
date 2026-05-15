import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import type { Provider } from "@/api/types/provider";
import type { ConcreteBinding } from "@/lib/catalogRef";

/**
 * Flatten providers / models / hosts into the `(provider, model, host)`
 * triples that {@link catalogRef.refCovers} and friends consume.
 *
 * The wire data is host-id–anchored (`Model.spec.hosts[i].hostId` points at a
 * Host row); we resolve to host *slug* here because catalog-ref strings use
 * slugs.
 *
 * `includeDeprecated=false` drops models whose spec is flagged deprecated.
 */
export function buildConcreteCatalog(input: {
	providers: readonly Provider[];
	models: readonly Model[];
	hosts: readonly Host[];
	includeDeprecated?: boolean;
}): ConcreteBinding[] {
	const providerSlugById = new Map<string, string>();
	for (const p of input.providers) {
		if (p.metadata.id) providerSlugById.set(p.metadata.id, p.metadata.name);
	}
	const hostSlugById = new Map<string, string>();
	for (const h of input.hosts) {
		if (h.metadata.id) hostSlugById.set(h.metadata.id, h.metadata.name);
	}

	const out: ConcreteBinding[] = [];
	for (const m of input.models) {
		if (!input.includeDeprecated) {
			if (m.spec.deprecation || m.spec.deprecationDate) continue;
		}
		const ownerId =
			m.metadata.owner?.kind === "provider" ? m.metadata.owner.id : undefined;
		const provider = ownerId ? providerSlugById.get(ownerId) : undefined;
		if (!provider) continue;
		for (const b of m.spec.hosts ?? []) {
			const host = hostSlugById.get(b.hostId);
			if (!host) continue;
			out.push({ provider, model: m.metadata.name, host });
		}
	}
	return out;
}
