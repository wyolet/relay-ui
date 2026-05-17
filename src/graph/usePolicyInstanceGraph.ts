import { useMemo } from "react";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import type { Policy } from "@/api/types/policy";
import type { RateLimit } from "@/api/types/ratelimit";
import type { RelayKey } from "@/api/types/relayKey";
import { useDiagnosticGraph } from "@/diagnostics/useDiagnostics";

export interface PolicyGraphEdge {
	from: string;
	to: string;
	strength: "required" | "partial" | "info";
	label?: string;
	broken?: boolean;
}

export interface PolicyGraphNode {
	id: string;
	kind: "policy" | "hostKey" | "host" | "rateLimit" | "relayKey";
	label: string;
	enabled: boolean;
	missing?: boolean;
}

export interface PolicyInstanceGraph {
	nodes: PolicyGraphNode[];
	edges: PolicyGraphEdge[];
}

export function usePolicyInstanceGraph(
	policy: Policy,
): PolicyInstanceGraph {
	const graph = useDiagnosticGraph();
	return useMemo(() => derive(policy, graph), [policy, graph]);
}

function derive(
	policy: Policy,
	graph: ReturnType<typeof useDiagnosticGraph>,
): PolicyInstanceGraph {
	const nodes: PolicyGraphNode[] = [];
	const edges: PolicyGraphEdge[] = [];

	const policyId = policy.metadata.id ?? policy.metadata.name;
	nodes.push({
		id: `policy:${policyId}`,
		kind: "policy",
		label: policy.metadata.displayName || policy.metadata.name,
		enabled: policy.spec.enabled !== false,
	});

	const hostIdsSeen = new Set<string>();

	for (const hkId of policy.spec.hostKeyIds ?? []) {
		const hk: HostKey | undefined = graph.hostKeys.get(hkId);
		const hkLabel = hk?.metadata.displayName || hk?.metadata.name || hkId;
		const hkEnabled = hk?.spec.enabled !== false;
		const hkMissing = !hk;
		nodes.push({
			id: `hostKey:${hkId}`,
			kind: "hostKey",
			label: hkLabel,
			enabled: hkEnabled && !hkMissing,
			missing: hkMissing,
		});
		edges.push({
			from: `policy:${policyId}`,
			to: `hostKey:${hkId}`,
			strength: "required",
			broken: hkMissing || !hkEnabled,
		});

		const hostId = hk?.spec.hostId;
		if (hostId) {
			const host: Host | undefined = graph.hosts.get(hostId);
			const hostLabel = host?.metadata.displayName || host?.metadata.name || hostId;
			const hostMissing = !host;
			if (!hostIdsSeen.has(hostId)) {
				nodes.push({
					id: `host:${hostId}`,
					kind: "host",
					label: hostLabel,
					enabled: host?.spec.enabled !== false && !hostMissing,
					missing: hostMissing,
				});
				hostIdsSeen.add(hostId);
			}
			edges.push({
				from: `hostKey:${hkId}`,
				to: `host:${hostId}`,
				strength: "required",
				broken: hostMissing || host?.spec.enabled === false,
			});
		}
	}

	const rlIds = new Set<string>();
	if (policy.spec.rateLimitId) rlIds.add(policy.spec.rateLimitId);
	for (const b of policy.spec.rlBindings ?? []) {
		if (b.rateLimitId) rlIds.add(b.rateLimitId);
	}
	for (const rlId of rlIds) {
		const rl: RateLimit | undefined = graph.rateLimits.get(rlId);
		const rlMissing = !rl;
		nodes.push({
			id: `rateLimit:${rlId}`,
			kind: "rateLimit",
			label: rl?.metadata.displayName || rl?.metadata.name || rlId,
			enabled: rl?.spec.enabled !== false && !rlMissing,
			missing: rlMissing,
		});
		edges.push({
			from: `policy:${policyId}`,
			to: `rateLimit:${rlId}`,
			strength: policy.spec.rateLimitId === rlId ? "required" : "partial",
			broken: rlMissing || rl?.spec.enabled === false,
		});
	}

	const relayKeys: RelayKey[] = graph.relayKeysByPolicyId.get(policyId) ?? [];
	for (const rk of relayKeys) {
		const rkId = rk.metadata.id ?? rk.metadata.name;
		nodes.push({
			id: `relayKey:${rkId}`,
			kind: "relayKey",
			label: rk.metadata.displayName || rk.metadata.name,
			enabled: rk.spec.enabled !== false,
		});
		edges.push({
			from: `relayKey:${rkId}`,
			to: `policy:${policyId}`,
			strength: "required",
			broken: policy.spec.enabled === false,
		});
	}

	return { nodes, edges };
}
