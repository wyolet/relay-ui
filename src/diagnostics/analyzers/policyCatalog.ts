import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import type { DiagnosticGraph } from "@/diagnostics/types";

interface ParsedRef {
	provider: string | null; // null only for `@host` form
	model: string | null;
	host: string | null;
}

/**
 * Parse a catalog-ref. Pickers emit canonical refs so we trust the syntax
 * (see project-catalog-ref-dsl). Returns null only on outright garbage.
 */
function parseRef(ref: string): ParsedRef | null {
	if (!ref) return null;
	const atIdx = ref.indexOf("@");
	const host = atIdx >= 0 ? ref.slice(atIdx + 1) || null : null;
	const before = atIdx >= 0 ? ref.slice(0, atIdx) : ref;
	if (before === "") return { provider: null, model: null, host };
	const slashIdx = before.indexOf("/");
	if (slashIdx >= 0) {
		return {
			provider: before.slice(0, slashIdx),
			model: before.slice(slashIdx + 1) || null,
			host,
		};
	}
	return { provider: before, model: null, host };
}

function providerSlugOf(m: Model, graph: DiagnosticGraph): string | null {
	if (m.metadata.owner?.kind !== "provider") return null;
	const providerId = m.metadata.owner.id;
	if (!providerId) return null;
	return graph.providers.get(providerId)?.metadata.name ?? null;
}

/**
 * Set of host IDs the policy's catalog refs touch — ignoring whether the
 * policy has keys for them. Used to detect attached host keys whose host
 * isn't in the policy's catalog (dangling keys after a ref edit).
 */
export function hostIdsInPolicyCatalog(
	policy: Policy,
	graph: DiagnosticGraph,
): Set<string> {
	const out = new Set<string>();
	const refs = (policy.spec.models ?? [])
		.map(parseRef)
		.filter((r): r is ParsedRef => r !== null);
	if (refs.length === 0) return out;

	for (const m of graph.models.values()) {
		if (m.spec.enabled === false) continue;
		const provider = providerSlugOf(m, graph);
		for (const binding of graph.bindingsByModel.get(m.metadata.id ?? "") ??
			[]) {
			if (binding.spec.enabled === false) continue;
			const host = graph.hosts.get(binding.spec.hostId);
			if (!host) continue;
			const hostSlug = host.metadata.name;
			const matches = refs.some((r) => {
				if (r.provider && r.provider !== provider) return false;
				if (r.model && r.model !== m.metadata.name) return false;
				if (r.host && r.host !== hostSlug) return false;
				return true;
			});
			if (matches) out.add(binding.spec.hostId);
		}
	}
	return out;
}

/**
 * Models reachable through the policy via the ref. A model counts if:
 *   - it matches the ref (provider / model / @host segments), AND
 *   - the binding's host is reachable: either an enabled host key points at it,
 *     or the host is `noAuth` (needs no credential — e.g. a local Ollama).
 *
 * Empty result = the grant unlocks nothing through this policy.
 */
export function modelsForRefViaPolicy(
	ref: string,
	policy: Policy,
	graph: DiagnosticGraph,
): Model[] {
	const parsed = parseRef(ref);
	if (!parsed) return [];

	// Hosts this policy can actually authenticate against: each enabled host
	// key contributes its host (if the host itself is enabled). `noAuth` hosts
	// need no key, so any enabled noAuth host is reachable unconditionally.
	const reachableHostIds = new Set<string>();
	for (const hkId of policy.spec.hostKeyIds ?? []) {
		const hk = graph.hostKeys.get(hkId);
		if (!hk || hk.spec.enabled === false) continue;
		const host = graph.hosts.get(hk.spec.hostId);
		if (!host || host.spec.enabled === false) continue;
		reachableHostIds.add(hk.spec.hostId);
	}
	for (const host of graph.hosts.values()) {
		if (host.spec.noAuth !== true) continue;
		if (host.spec.enabled === false) continue;
		const id = host.metadata.id;
		if (id) reachableHostIds.add(id);
	}
	if (reachableHostIds.size === 0) return [];

	const out: Model[] = [];
	for (const m of graph.models.values()) {
		if (m.spec.enabled === false) continue;
		if (parsed.provider) {
			if (providerSlugOf(m, graph) !== parsed.provider) continue;
		}
		if (parsed.model && m.metadata.name !== parsed.model) continue;
		const reachable = (
			graph.bindingsByModel.get(m.metadata.id ?? "") ?? []
		).some((b) => {
			if (b.spec.enabled === false) return false;
			if (!reachableHostIds.has(b.spec.hostId)) return false;
			if (parsed.host) {
				const host = graph.hosts.get(b.spec.hostId);
				if (!host || host.metadata.name !== parsed.host) return false;
			}
			return true;
		});
		if (reachable) out.push(m);
	}
	return out;
}
