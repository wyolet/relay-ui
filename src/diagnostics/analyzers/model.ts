import type { Model } from "@/api/types/model";
import type { Diagnostic, DiagnosticGraph } from "@/diagnostics/types";

function isDeprecated(m: Model): boolean {
	if (m.spec.deprecation?.status) return true;
	if (m.spec.deprecationDate) return true;
	const sunset = m.spec.deprecation?.sunsetDate;
	if (sunset) {
		const d = Date.parse(sunset);
		if (!Number.isNaN(d) && d < Date.now()) return true;
	}
	return false;
}

export function analyzeModel(
	model: Model,
	graph: DiagnosticGraph,
): Diagnostic[] {
	const out: Diagnostic[] = [];
	const enabled = model.spec.enabled !== false;
	const bindings = model.spec.hosts ?? [];

	const livingBindings = bindings.filter((b) => graph.hosts.has(b.hostId));
	const enabledBindings = livingBindings.filter(
		(b) => b.enabled !== false && graph.hosts.get(b.hostId)?.spec.enabled !== false,
	);

	if (bindings.length > 0 && enabledBindings.length === 0) {
		out.push({
			severity: "error",
			code: "model.all-hosts-unreachable",
			message:
				"Every host binding points at a disabled or deleted host — this model can't be served.",
		});
	} else if (
		bindings.length > 0 &&
		livingBindings.every((b) => b.enabled === false)
	) {
		out.push({
			severity: "warn",
			code: "model.all-bindings-disabled",
			message: "All host bindings are disabled.",
		});
	}

	if (isDeprecated(model)) {
		out.push({
			severity: "warn",
			code: "model.deprecated",
			message: "Marked deprecated — prefer the replacement if one is set.",
		});
	}

	// "Disabled but granted by enabled policies" — scan policy catalogs for grants
	// that name this model. Catalog DSL uses `provider/model` shape; for the
	// MVP we just detect any direct mention of the model's slug.
	if (!enabled) {
		const slug = model.metadata.name;
		const grantedBy: string[] = [];
		for (const p of graph.policies.values()) {
			if (p.spec.enabled === false) continue;
			const grants = p.spec.models ?? null;
			if (!grants || grants.length === 0) continue;
			if (grants.some((g) => g === slug || g.endsWith(`/${slug}`))) {
				grantedBy.push(p.metadata.displayName ?? p.metadata.name);
			}
		}
		if (grantedBy.length > 0) {
			out.push({
				severity: "warn",
				code: "model.disabled-with-grants",
				message: `Disabled but granted by ${grantedBy.length} enabled polic${grantedBy.length === 1 ? "y" : "ies"}.`,
			});
		}
	}

	return out;
}
