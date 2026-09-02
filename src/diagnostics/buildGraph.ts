import type { Binding } from "@/api/hooks/bindings";
import { bindingsByHost, bindingsByModel } from "@/api/hooks/bindings";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import type { Key } from "@/api/types/key";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import type { Provider } from "@/api/types/provider";
import type { RateLimit } from "@/api/types/ratelimit";
import type { DiagnosticGraph } from "./types";

interface GraphInput {
	policies: Policy[];
	hostKeys: HostKey[];
	hosts: Host[];
	models: Model[];
	rateLimits: RateLimit[];
	keys: Key[];
	providers: Provider[];
	bindings: Binding[];
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
	const keysByPolicyId = new Map<string, Key[]>();
	for (const rk of input.keys) {
		const pid = rk.spec.policyId;
		if (!pid) continue;
		const list = keysByPolicyId.get(pid);
		if (list) list.push(rk);
		else keysByPolicyId.set(pid, [rk]);
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
		keys: byId(input.keys),
		providers: byId(input.providers),
		bindingsByModel: bindingsByModel(input.bindings),
		bindingsByHost: bindingsByHost(input.bindings),
		keysByPolicyId,
		policiesByHostKeyId,
		policiesByRateLimitId,
	};
}
