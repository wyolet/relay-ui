import type { Policy } from "@/api/types/policy";
import {
	hostIdsInPolicyCatalog,
	modelsForRefViaPolicy,
} from "@/diagnostics/analyzers/policyCatalog";
import type { Diagnostic, DiagnosticGraph } from "@/diagnostics/types";
import {
	type CatalogRef,
	parseCatalogRef,
	refCovers,
	refsOverlap,
	validateCatalogRef,
} from "@/lib/catalogRef";
import { buildConcreteCatalog } from "@/lib/concreteCatalog";
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
				message: `This policy reaches no models. ${deadGrants
					.map(describeDeadGrant)
					.join(" ")}`,
			});
		} else if (deadGrants.length > 0) {
			out.push({
				severity: "warn",
				code: "policy.catalog-resolves-empty",
				message: deadGrants.map(describeDeadGrant).join(" "),
			});
		}
	}

	// Host keys whose host isn't covered by the policy's catalog refs. Happens
	// after operator removes a host/provider from the model picker but leaves
	// the key attached. Diagnostic mirrors the per-row "not in catalog" badge.
	if (grants.length > 0 && hostKeyIds.length > 0) {
		const catalogHostIds = hostIdsInPolicyCatalog(policy, graph);
		const stray: { keyLabel: string; hostLabel: string }[] = [];
		for (const hk of livingKeys) {
			if (catalogHostIds.has(hk.spec.hostId)) continue;
			const host = graph.hosts.get(hk.spec.hostId);
			stray.push({
				keyLabel: displayLabel(hk.metadata),
				hostLabel: host ? displayLabel(host.metadata) : hk.spec.hostId,
			});
		}
		if (stray.length > 0) {
			const phrased = stray
				.map((s) => `"${s.keyLabel}" (host "${s.hostLabel}")`)
				.join(", ");
			out.push({
				severity: "warn",
				code: "policy.host-keys-outside-catalog",
				message:
					stray.length === 1
						? `Host key ${phrased} stays attached but its host isn't in this policy's catalog. Detach the key or add models served on that host.`
						: `${stray.length} host keys stay attached but their hosts aren't in this policy's catalog: ${phrased}. Detach them or add models served on those hosts.`,
			});
		}
	}

	// Dead rl-binding: the RL's scope shares no concrete (provider, model, host)
	// triple with any policy grant. We use refsOverlap rather than refIncludesRef
	// here — a host-only RL scope like `@bedrock` isn't strictly *contained* by
	// a provider grant like `anthropic`, but their intersection (anthropic on
	// bedrock) is non-empty, which is what we actually care about.
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
				return !grantRefs.some((g) => refsOverlap(g, scope));
			});
			if (orphans.length === scopeRaws.length) {
				const rl = b.rateLimitId
					? graph.rateLimits.get(b.rateLimitId)
					: undefined;
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

	// Unthrottled models: catalog grants reach (model, host) triples that no
	// rate-limit binding covers. Surfaced as info — the RL tab has the table
	// detail; this entry just acknowledges the count in the Issues section so
	// operators don't miss it.
	if (grants.length > 0 && !policy.spec.rateLimitId) {
		const grantParsed = grants
			.filter((g) => !validateCatalogRef(g))
			.map((g) => parseCatalogRef(g));
		const scopeParsedByBinding = (policy.spec.rlBindings ?? []).map((b) =>
			(b.models ?? [])
				.filter((m) => !validateCatalogRef(m))
				.map((m) => parseCatalogRef(m)),
		);
		const catalog = buildConcreteCatalog({
			providers: [...graph.providers.values()],
			models: [...graph.models.values()],
			hosts: [...graph.hosts.values()],
			bindings: [...graph.bindingsByModel.values()].flat(),
			includeDeprecated: policy.spec.includeDeprecated ?? false,
		});
		const uncovered = new Set<string>();
		for (const bnd of catalog) {
			if (!grantParsed.some((g) => refCovers(g, bnd))) continue;
			const covered = scopeParsedByBinding.some((scopes) =>
				scopes.some((s) => refCovers(s, bnd)),
			);
			if (!covered) uncovered.add(`${bnd.provider}/${bnd.model}`);
		}
		if (uncovered.size > 0) {
			out.push({
				severity: "info",
				code: "policy.models-unthrottled",
				message: `${uncovered.size} model${uncovered.size === 1 ? "" : "s"} pass without any rate limit — see the Rate limits tab for the full list.`,
			});
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

/**
 * Per-grant explanation for `policy.catalog-resolves-empty`. `modelsForRefViaPolicy`
 * returns 0 in three families of cases: no key for the host that serves the
 * ref, host/model/provider not in catalog, or matching things are disabled.
 * The phrasing leans on the action the operator can take.
 */
function describeDeadGrant(raw: string): string {
	let r: CatalogRef;
	try {
		r = parseCatalogRef(raw);
	} catch {
		return `Grant "${raw}" matches nothing in the catalog.`;
	}
	switch (r.kind) {
		case "host":
			return `No models are reachable on host "${r.host}" — attach a host key for it, or remove "${raw}".`;
		case "provider":
			return `No "${r.provider}" models are reachable — attach a host key for a host that serves ${r.provider}, or remove "${raw}".`;
		case "provider-on-host":
			return `No "${r.provider}" models are reachable on host "${r.host}" — attach a host key for it, or remove "${raw}".`;
		case "model":
			return `Model "${r.provider}/${r.model}" isn't reachable — no host you have a key for serves it. Attach a key, or remove "${raw}".`;
		case "binding":
			return `Model "${r.provider}/${r.model}" isn't reachable on host "${r.host}" — attach a host key for it, or remove "${raw}".`;
	}
}
