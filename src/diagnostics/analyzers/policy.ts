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
	// Host-owned policies (provider tiers) are reference shapes pointed AT
	// by accounts; they don't pool credentials, can't be attached to user
	// policies, and their rate-limit / catalog state is the provider's
	// contract, not something an operator can fix from this UI. Skip every check.
	if (policy.metadata.owner?.kind === "host") {
		return out;
	}

	const credentialIds = policy.spec.credentialIds ?? [];
	const resolvedKeys = credentialIds.map((id) => graph.hostKeys.get(id));
	const livingKeys = resolvedKeys.filter((k) => k !== undefined);
	const enabledKeys = livingKeys.filter((k) => k.spec.enabled !== false);
	// A grant on a `noAuth` host (e.g. local Ollama) reaches models with no
	// credential — so an empty pool isn't necessarily a misconfiguration.
	const grants = policy.spec.models ?? [];
	const reachesWithoutKeys = grants.some(
		(g) => modelsForRefViaPolicy(g, policy, graph).length > 0,
	);
	// poolIds is non-empty when the policy links pools (not checked here — pool
	// data isn't loaded into the graph). Only warn when both are absent.
	const hasPools = (policy.spec.poolIds?.length ?? 0) > 0;
	if (credentialIds.length === 0 && !hasPools && !reachesWithoutKeys) {
		out.push({
			severity: "error",
			code: "policy.no-host-keys",
			message:
				"No credentials or pools attached — this policy can't authenticate any upstream request.",
		});
	} else if (credentialIds.length > 0 && enabledKeys.length === 0) {
		out.push({
			severity: "error",
			code: "policy.host-keys-all-disabled",
			message:
				"All attached credentials are disabled or deleted — no upstream credential is usable.",
		});
	} else if (enabledKeys.length < livingKeys.length) {
		const disabledKeys = livingKeys.filter((k) => k.spec.enabled === false);
		const names = disabledKeys
			.map((k) => `"${displayLabel(k.metadata)}"`)
			.join(", ");
		out.push({
			severity: "warn",
			code: "policy.host-keys-degraded",
			message: `Disabled credentials in the pool: ${names}.`,
		});
	}

	// Transitive: at least one enabled credential has its host disabled / missing.
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
					"Every enabled credential points at a host that is disabled or deleted.",
			});
		}
	}

	// Rate-limit checks: surface disabled / missing referenced RLs.
	// In v0.20, rateLimits replaces the old rateLimitId + rlBindings fields.
	const refRateLimitIds = new Set(
		(policy.spec.rateLimits ?? []).map((rl) => rl.rateLimitId),
	);
	for (const rlId of refRateLimitIds) {
		const rl = graph.rateLimits.get(rlId);
		if (!rl) continue;
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

	// Credentials whose host isn't covered by the policy's catalog refs.
	if (grants.length > 0 && credentialIds.length > 0) {
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
						? `Credential ${phrased} stays attached but its host isn't in this policy's catalog. Detach the credential or add models served on that host.`
						: `${stray.length} credentials stay attached but their hosts aren't in this policy's catalog: ${phrased}. Detach them or add models served on those hosts.`,
			});
		}
	}

	// Dead rl entry: the RL's model scope shares no concrete triple with any grant.
	if (grants.length > 0) {
		const grantRefs = grants
			.filter((g) => !validateCatalogRef(g))
			.map((g) => parseCatalogRef(g));
		for (const rlEntry of policy.spec.rateLimits ?? []) {
			const scopeRaws = rlEntry.models ?? [];
			if (scopeRaws.length === 0) continue;
			const orphans = scopeRaws.filter((raw) => {
				if (validateCatalogRef(raw)) return false;
				const scope = parseCatalogRef(raw);
				return !grantRefs.some((g) => refsOverlap(g, scope));
			});
			if (orphans.length === scopeRaws.length) {
				const rl = graph.rateLimits.get(rlEntry.rateLimitId);
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

	// Unthrottled models: grants reach triples that no rate-limit entry covers.
	const rateLimits = policy.spec.rateLimits ?? [];
	if (grants.length > 0 && rateLimits.length === 0) {
		const grantParsed = grants
			.filter((g) => !validateCatalogRef(g))
			.map((g) => parseCatalogRef(g));
		const scopeParsedByEntry = rateLimits.map((rl) =>
			(rl.models ?? [])
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
			const covered = scopeParsedByEntry.some((scopes) =>
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

	return out;
}

/**
 * Per-grant explanation for `policy.catalog-resolves-empty`. `modelsForRefViaPolicy`
 * returns 0 in three families of cases: no credential for the host that serves the
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
			return `No models are reachable on host "${r.host}" — attach a credential for it, or remove "${raw}".`;
		case "provider":
			return `No "${r.provider}" models are reachable — attach a credential for a host that serves ${r.provider}, or remove "${raw}".`;
		case "provider-on-host":
			return `No "${r.provider}" models are reachable on host "${r.host}" — attach a credential for it, or remove "${raw}".`;
		case "model":
			return `Model "${r.provider}/${r.model}" isn't reachable — no host you have a key for serves it. Attach a key, or remove "${raw}".`;
		case "binding":
			return `Model "${r.provider}/${r.model}" isn't reachable on host "${r.host}" — attach a credential for it, or remove "${raw}".`;
	}
}
