import type { RateLimit } from "@/api/types/ratelimit";
import type { Diagnostic, DiagnosticGraph } from "@/diagnostics/types";

export function analyzeRateLimit(
	rl: RateLimit,
	graph: DiagnosticGraph,
): Diagnostic[] {
	const out: Diagnostic[] = [];
	const enabled = rl.spec.enabled !== false;
	const id = rl.metadata.id;

	const refs = id ? (graph.policiesByRateLimitId.get(id) ?? []) : [];
	const enabledRefs = refs.filter((p) => p.spec.enabled !== false);

	if (!enabled && enabledRefs.length > 0) {
		out.push({
			severity: "warn",
			code: "rate-limit.disabled-with-refs",
			message: `Disabled but referenced by ${enabledRefs.length} enabled polic${enabledRefs.length === 1 ? "y" : "ies"} — the limit silently does not apply for them.`,
		});
	}

	if (refs.length === 0) {
		out.push({
			severity: "info",
			code: "rate-limit.orphan",
			message: "Not referenced by any policy.",
		});
	}

	if (!enabled) {
		out.push({
			severity: "info",
			code: "rate-limit.disabled",
			message: "Disabled — this rule does not apply anywhere.",
		});
	}

	return out;
}
