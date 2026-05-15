import type { HostKey } from "@/api/types/hostkey";
import type { Diagnostic, DiagnosticGraph } from "@/diagnostics/types";

export function analyzeHostKey(
	hk: HostKey,
	graph: DiagnosticGraph,
): Diagnostic[] {
	const out: Diagnostic[] = [];
	const enabled = hk.spec.enabled !== false;
	const hkId = hk.metadata.id;

	const host = graph.hosts.get(hk.spec.hostId);
	if (!host) {
		// BE-soon B2 makes hosts non-deletable; until then this can occur.
		out.push({
			severity: "error",
			code: "host-key.host-dangling",
			message: "Referenced host no longer exists.",
		});
	} else if (host.spec.enabled === false) {
		out.push({
			severity: "warn",
			code: "host-key.host-disabled",
			message: `Host "${host.metadata.displayName ?? host.metadata.name}" is disabled — this credential is unreachable.`,
		});
	}

	const hostPolicy = graph.policies.get(hk.spec.policyId);
	if (!hostPolicy) {
		// BE-soon A1 will reject host-key writes that don't match host ownership.
		out.push({
			severity: "error",
			code: "host-key.host-policy-dangling",
			message: "Referenced host policy no longer exists.",
		});
	} else if (hostPolicy.spec.enabled === false) {
		out.push({
			severity: "warn",
			code: "host-key.host-policy-disabled",
			message: `Host policy "${hostPolicy.metadata.displayName ?? hostPolicy.metadata.name}" is disabled.`,
		});
	}

	const userPolicies = hkId
		? (graph.policiesByHostKeyId.get(hkId) ?? []).filter(
				(p) => p.metadata.owner?.kind !== "host",
			)
		: [];
	if (userPolicies.length === 0) {
		out.push({
			severity: "info",
			code: "host-key.orphan",
			message: "Not attached to any user policy.",
		});
	}

	if (!enabled) {
		out.push({
			severity: "info",
			code: "host-key.disabled",
			message: "Disabled — relay won't route requests through this credential.",
		});
	}

	return out;
}
