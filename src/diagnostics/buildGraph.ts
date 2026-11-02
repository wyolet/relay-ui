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
	// In v0.20 relay keys carry no policyId; the policy–key link is a PolicyBinding.
	// We no longer index keys by policy.

	const policiesByCredentialId = new Map<string, Policy[]>();
	const policiesByRateLimitId = new Map<string, Policy[]>();
	for (const p of input.policies) {
		for (const credId of p.spec.credentialIds ?? []) {
			const list = policiesByCredentialId.get(credId);
			if (list) list.push(p);
			else policiesByCredentialId.set(credId, [p]);
		}
		for (const rl of p.spec.rateLimits ?? []) {
			const list = policiesByRateLimitId.get(rl.rateLimitId);
			if (list) list.push(p);
			else policiesByRateLimitId.set(rl.rateLimitId, [p]);
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
		policiesByCredentialId,
		policiesByRateLimitId,
	};
}
