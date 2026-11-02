import type { Key } from "@/api/types/key";
import type { Diagnostic, DiagnosticGraph } from "@/diagnostics/types";

// In v0.20 relay keys carry no policyId; the policy–key link is a PolicyBinding.
// Per-key analysis is limited to the key's own state.
export function analyzeKey(rk: Key, _graph: DiagnosticGraph): Diagnostic[] {
	const out: Diagnostic[] = [];

	if (rk.spec.enabled === false) {
		out.push({
			severity: "info",
			code: "key.disabled",
			message: "Disabled — requests with this key return 401.",
		});
	}

	return out;
}
