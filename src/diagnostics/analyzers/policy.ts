import type { Policy } from "@/api/types/policy";
import { modelsForRefViaPolicy } from "@/diagnostics/analyzers/policyCatalog";
import type { Diagnostic, DiagnosticGraph } from "@/diagnostics/types";
import {
	parseCatalogRef,
	refIncludesRef,
	validateCatalogRef,
} from "@/lib/catalogRef";
import { displayLabel } from "@/lib/displayLabel";

export function analyzePolicy(
	policy: Policy,
	graph: DiagnosticGraph,
): Diagnostic[] {
	const out: Diagnostic[] = [];
	const policyId = policy.metadata.id;
	const enabled = policy.spec.enabled !== false;
	// Host-owned policies (provider tiers) are reference shapes pointed AT
	// by host keys; they don't pool keys, can't be attached to relay keys,
	// and their rate-limit / catalog state is the provider's contract, not
	// something an operator can fix from this UI. Skip every check.
	if (policy.metadata.owner?.kind === "host") {
		return out;
	}

	const hostKeyIds = policy.spec.hostKeyIds ?? [];
	const resolvedKeys = hostKeyIds.map((id) => graph.hostKeys.get(id));
	const livingKeys = resolvedKeys.filter((k) => k !== undefined);
	const enabledKeys = livingKeys.filter((k) => k.spec.enabled !== false);
	if (hostKeyIds.length === 0) {
		out.push({
			severity: "error",
			code: "policy.no-host-keys",
			message:
				"No host keys attached — this policy can't authenticate any upstream request.",
		});
	} else if (enabledKeys.length === 0) {
		out.push({
			severity: "error",
			code: "policy.host-keys-all-disabled",
			message:
				"All attached host keys are disabled or deleted — no upstream credential is usable.",
		});
	} else if (enabledKeys.length < livingKeys.length) {
		const disabledKeys = livingKeys.filter((k) => k.spec.enabled === false);
		const names = disabledKeys
			.map((k) => `"${displayLabel(k.metadata)}"`)
			.join(", ");
		out.push({
			severity: "warn",
			code: "policy.host-keys-degraded",
			message: `Disabled host keys in the pool: ${names}.`,
		});
	}

	// Transitive: at least one enabled host key has its host disabled / missing.
	if (enabledKeys.length > 0) {
		const allHostsUnreachable = enabledKeys.every((k) => {
			const host = graph.hosts.get(k.spec.hostId);
			return !host || host.spec.enabled === false;
		});
		if (allHostsUnreachable) {
			out.push({
				severity: "error",
				code: "policy.host-disabled-transitive",
				message:
					"Every enabled host key points at a host that is disabled or deleted.",
			});
		}
	}

	// Rate-limit checks: surface disabled / missing referenced RLs.
	const refRateLimitIds = new Set<string>();
	if (policy.spec.rateLimitId) refRateLimitIds.add(policy.spec.rateLimitId);
	for (const b of policy.spec.rlBindings ?? []) {
		if (b.rateLimitId) refRateLimitIds.add(b.rateLimitId);
	}
	for (const rlId of refRateLimitIds) {
		const rl = graph.rateLimits.get(rlId);
		if (!rl) continue; // BE-soon B3 strips these; rendering "missing" RL is low signal until then.
		if (rl.spec.enabled === false) {
			out.push({
				severity: "warn",
				code: "policy.rate-limit-disabled",
				message: `Rate limit "${displayLabel(rl.metadata)}" is disabled — it silently does not apply.`,
				link: {
					to: "/policies/rate-limits/$name",
					params: { name: rl.metadata.name },
				},
			});
		}
	}

	// Catalog coverage: if every grant resolves to zero reachable models, the
	// policy can't serve anything. Pickers emit canonical refs so we trust
	// the DSL syntax and just check usability against the graph.
	const grants = policy.spec.models ?? [];
	if (grants.length > 0) {
		const deadGrants = grants.filter(
			(g) => modelsForRefViaPolicy(g, policy, graph).length === 0,
		);
		if (deadGrants.length === grants.length) {
			out.push({
				severity: "error",
				code: "policy.catalog-resolves-empty",
				message: `Every catalog grant is unreachable: ${deadGrants
					.map((g) => `"${g}"`)
					.join(", ")}.`,
			});
		} else if (deadGrants.length > 0) {
			out.push({
				severity: "warn",
				code: "policy.catalog-resolves-empty",
				message: `Unreachable catalog grants: ${deadGrants
					.map((g) => `"${g}"`)
					.join(", ")}. Remove them or attach a host key that serves them.`,
			});
		}
	}

	// Dead rl-binding: binding's scope ref isn't covered by any of the policy's
	// catalog grants. Containment is conceptual (provider covers provider/model
	// etc.), so use refIncludesRef rather than literal string equality.
	if (grants.length > 0) {
		const grantRefs = grants
			.filter((g) => !validateCatalogRef(g))
			.map((g) => parseCatalogRef(g));
		for (const b of policy.spec.rlBindings ?? []) {
			const scopeRaws = b.models ?? [];
			if (scopeRaws.length === 0) continue;
			const orphans = scopeRaws.filter((raw) => {
				if (validateCatalogRef(raw)) return false; // syntax-invalid → skip (separate diagnostic)
				const scope = parseCatalogRef(raw);
				return !grantRefs.some((g) => refIncludesRef(g, scope));
			});
			if (orphans.length === scopeRaws.length) {
				const rl = b.rateLimitId ? graph.rateLimits.get(b.rateLimitId) : undefined;
				const rlLabel = rl ? `"${displayLabel(rl.metadata)}"` : "Rate limit";
				const targets = orphans.map((m) => `"${m}"`).join(", ");
				const isPlural = orphans.length > 1;
				out.push({
					severity: "warn",
					code: "policy.rl-binding-dead",
					message: `Rate limit ${rlLabel} in this policy targets ${targets}, which ${
						isPlural ? "aren't" : "isn't"
					} in the policy's catalog. Remove this rate limit, or add ${targets} to the policy's models.`,
				});
			}
		}
	}

	{
		const attachedRelayKeys = policyId
			? (graph.relayKeysByPolicyId.get(policyId) ?? [])
			: [];
		const enabledRelayKeys = attachedRelayKeys.filter(
			(rk) => rk.spec.enabled !== false,
		);

		if (!enabled && enabledRelayKeys.length > 0) {
			out.push({
				severity: "warn",
				code: "policy.disabled-with-relay-keys",
				message: `Policy is disabled but ${enabledRelayKeys.length} enabled relay key${enabledRelayKeys.length === 1 ? "" : "s"} reference it — they will reject requests.`,
			});
		}

		if (attachedRelayKeys.length === 0) {
			out.push({
				severity: "info",
				code: "policy.no-relay-keys",
				message:
					"No relay keys are attached — this policy receives no traffic.",
			});
		}
	}

	return out;
}
