import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import { policyCredentialIds } from "@/diagnostics/buildGraph";
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
 * policy has credentials for them. Used to detect attached credentials whose
 * host isn't in the policy's catalog (dangling keys after a ref edit).
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
 *   - the binding's host is reachable: an enabled credential the policy draws
 *     on (through a pool or directly) is at it, or a linked pool sits at it and
 *     the host is `noAuth` (a keyless host is reached only through a pool).
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

	const reachableHostIds = new Set<string>();
	for (const credId of policyCredentialIds(policy, graph.pools)) {
		const hk = graph.hostKeys.get(credId);
		if (!hk || hk.spec.enabled === false) continue;
		const host = graph.hosts.get(hk.spec.hostId);
		if (!host || host.spec.enabled === false) continue;
		reachableHostIds.add(hk.spec.hostId);
	}
	for (const poolId of policy.spec.poolIds ?? []) {
		const hostId = graph.pools.get(poolId)?.spec.hostId;
		const host = hostId ? graph.hosts.get(hostId) : undefined;
		if (!hostId || !host || host.spec.enabled === false) continue;
		if (host.spec.noAuth === true) reachableHostIds.add(hostId);
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
