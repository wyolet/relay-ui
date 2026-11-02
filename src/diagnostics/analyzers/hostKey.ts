import type { HostKey } from "@/api/types/hostkey";
import type { Diagnostic, DiagnosticGraph } from "@/diagnostics/types";
import { displayLabel } from "@/lib/displayLabel";

export function analyzeHostKey(
	hk: HostKey,
	graph: DiagnosticGraph,
): Diagnostic[] {
	const out: Diagnostic[] = [];
	const enabled = hk.spec.enabled !== false;
	const hkId = hk.metadata.id;

	const host = graph.hosts.get(hk.spec.hostId);
	if (!host) {
		out.push({
			severity: "error",
			code: "host-key.host-dangling",
			message: "Referenced host no longer exists.",
		});
	} else if (host.spec.enabled === false) {
		out.push({
			severity: "warn",
			code: "host-key.host-disabled",
			message: `Host "${displayLabel(host.metadata)}" is disabled — this credential is unreachable.`,
		});
	}

	// A credential not listed in any policy's credentialIds is unreferenced by
	// direct-attachment policies. Note: pool-linked credentials won't appear here
	// because pool data isn't loaded into the graph.
	const userPolicies = hkId
		? (graph.policiesByCredentialId.get(hkId) ?? []).filter(
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
