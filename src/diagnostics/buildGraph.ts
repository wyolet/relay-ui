import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import type { Provider } from "@/api/types/provider";
import type { RateLimit } from "@/api/types/ratelimit";
import type { RelayKey } from "@/api/types/relayKey";
import type { DiagnosticGraph } from "./types";

interface GraphInput {
	policies: Policy[];
	hostKeys: HostKey[];
	hosts: Host[];
	models: Model[];
	rateLimits: RateLimit[];
	relayKeys: RelayKey[];
	providers: Provider[];
}

function byId<T extends { metadata: { id?: string } }>(
	items: T[],
): Map<string, T> {
	const out = new Map<string, T>();
	for (const item of items) {
		if (item.metadata.id) out.set(item.metadata.id, item);
	}
	return out;
}

export function buildDiagnosticGraph(input: GraphInput): DiagnosticGraph {
	const relayKeysByPolicyId = new Map<string, RelayKey[]>();
	for (const rk of input.relayKeys) {
		const pid = rk.spec.policyId;
		if (!pid) continue;
		const list = relayKeysByPolicyId.get(pid);
		if (list) list.push(rk);
		else relayKeysByPolicyId.set(pid, [rk]);
	}

	const policiesByHostKeyId = new Map<string, Policy[]>();
	const policiesByRateLimitId = new Map<string, Policy[]>();
	for (const p of input.policies) {
		for (const hkId of p.spec.hostKeyIds ?? []) {
			const list = policiesByHostKeyId.get(hkId);
			if (list) list.push(p);
			else policiesByHostKeyId.set(hkId, [p]);
		}
		const rlIds = new Set<string>();
		if (p.spec.rateLimitId) rlIds.add(p.spec.rateLimitId);
		for (const b of p.spec.rlBindings ?? []) {
			if (b.rateLimitId) rlIds.add(b.rateLimitId);
		}
		for (const rlId of rlIds) {
			const list = policiesByRateLimitId.get(rlId);
			if (list) list.push(p);
			else policiesByRateLimitId.set(rlId, [p]);
		}
	}

	return {
		policies: byId(input.policies),
		hostKeys: byId(input.hostKeys),
		hosts: byId(input.hosts),
		models: byId(input.models),
		rateLimits: byId(input.rateLimits),
		relayKeys: byId(input.relayKeys),
		providers: byId(input.providers),
		relayKeysByPolicyId,
		policiesByHostKeyId,
		policiesByRateLimitId,
	};
}
