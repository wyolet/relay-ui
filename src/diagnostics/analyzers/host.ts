import type { Host } from "@/api/types/host";
import type { Diagnostic, DiagnosticGraph } from "@/diagnostics/types";

export function analyzeHost(host: Host, graph: DiagnosticGraph): Diagnostic[] {
	const out: Diagnostic[] = [];
	const enabled = host.spec.enabled !== false;
	const hostId = host.metadata.id;

	const keys = hostId
		? Array.from(graph.hostKeys.values()).filter(
				(k) => k.spec.hostId === hostId,
			)
		: [];
	const bindings = hostId
		? Array.from(graph.models.values()).filter((m) =>
				(m.spec.hosts ?? []).some((b) => b.hostId === hostId),
			)
		: [];

	if (!enabled) {
		const enabledKeys = keys.filter((k) => k.spec.enabled !== false);
		const enabledBindings = bindings.filter((m) => m.spec.enabled !== false);
		if (enabledKeys.length > 0 || enabledBindings.length > 0) {
			out.push({
				severity: "warn",
				code: "host.disabled-with-refs",
				message: `Disabled but still referenced — ${enabledKeys.length} enabled host key${enabledKeys.length === 1 ? "" : "s"}, ${enabledBindings.length} enabled model binding${enabledBindings.length === 1 ? "" : "s"} will fail.`,
			});
		}
	}

	if (host.spec.defaultPolicy) {
		// `spec.defaultPolicy` holds the policy id (UUID), not the slug.
		const found = graph.policies.has(host.spec.defaultPolicy);
		if (!found) {
			out.push({
				severity: "warn",
				code: "host.default-policy-dangling",
				message: "Default policy no longer exists.",
			});
		}
	}

	if (keys.length === 0) {
		out.push({
			severity: "info",
			code: "host.no-keys",
			message: "No host keys registered for this host.",
		});
	}

	if (bindings.length === 0) {
		out.push({
			severity: "info",
			code: "host.no-bindings",
			message: "No models bind to this host — nothing routes through it.",
		});
	}

	return out;
}
