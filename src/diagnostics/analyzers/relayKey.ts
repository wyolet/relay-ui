import type { RelayKey } from "@/api/types/relayKey";
import { analyzePolicy } from "@/diagnostics/analyzers/policy";
import type { Diagnostic, DiagnosticGraph } from "@/diagnostics/types";
import { displayLabel } from "@/lib/displayLabel";

export function analyzeRelayKey(
	rk: RelayKey,
	graph: DiagnosticGraph,
): Diagnostic[] {
	const out: Diagnostic[] = [];
	const enabled = rk.spec.enabled !== false;

	const policy = graph.policies.get(rk.spec.policyId);

	if (!policy) {
		out.push({
			severity: "error",
			code: "relay-key.policy-dangling",
			message: "Attached policy no longer exists — requests will be rejected.",
		});
	} else {
		if (policy.spec.enabled === false) {
			out.push({
				severity: "warn",
				code: "relay-key.policy-disabled",
				message: `Attached policy "${displayLabel(policy.metadata)}" is disabled — requests will return 401.`,
			});
		}
		// Roll up the policy's own errors (don't duplicate messages — just summarise).
		const policyDiag = analyzePolicy(policy, graph);
		const policyErrors = policyDiag.filter((d) => d.severity === "error");
		if (policyErrors.length > 0) {
			out.push({
				severity: "error",
				code: "relay-key.policy-broken",
				message: `Attached policy has ${policyErrors.length} error${policyErrors.length === 1 ? "" : "s"} — fix on the policy page.`,
			});
		}
	}

	if (!enabled) {
		out.push({
			severity: "info",
			code: "relay-key.disabled",
			message: "Disabled — requests with this key return 401.",
		});
	}

	return out;
}
