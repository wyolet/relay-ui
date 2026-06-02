import type { Binding } from "@/api/hooks/bindings";
import { bindingsByModel } from "@/api/hooks/bindings";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import type { Provider } from "@/api/types/provider";
import type { ConcreteBinding } from "@/lib/catalogRef";

/**
 * Flatten providers / models / host-bindings into the `(provider, model, host)`
 * triples that {@link catalogRef.refCovers} and friends consume.
 *
 * Bindings are a standalone resource (`Binding.spec.modelId` / `.hostId` point
 * at Model / Host rows); we resolve to host *slug* here because catalog-ref
 * strings use slugs.
 *
 * `includeDeprecated=false` drops models whose spec is flagged deprecated.
 */
export function buildConcreteCatalog(input: {
	providers: readonly Provider[];
	models: readonly Model[];
	hosts: readonly Host[];
	bindings: readonly Binding[];
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
	const byModel = bindingsByModel(input.bindings);

	const out: ConcreteBinding[] = [];
	for (const m of input.models) {
		if (!input.includeDeprecated) {
			if (m.spec.deprecation || m.spec.deprecationDate) continue;
		}
		const ownerId =
			m.metadata.owner?.kind === "provider" ? m.metadata.owner.id : undefined;
		const provider = ownerId ? providerSlugById.get(ownerId) : undefined;
		if (!provider) continue;
		for (const b of byModel.get(m.metadata.id ?? "") ?? []) {
			const host = hostSlugById.get(b.spec.hostId);
			if (!host) continue;
			out.push({ provider, model: m.metadata.name, host });
		}
	}
	return out;
}
