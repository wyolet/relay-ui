import {
	type CatalogRef,
	type ConcreteBinding,
	parseCatalogRef,
	refCovers,
} from "@/lib/catalogRef";

/** What one model-scope ref of a rate-limit link covers in the local catalog. */
export interface RefCoverage {
	raw: string;
	parsed: CatalogRef | null;
	coveredBindings: ConcreteBinding[];
	models: number;
	hosts: number;
}

export interface LabelLookups {
	providerByName: Map<string, string>;
	hostByName: Map<string, string>;
	/** Keyed by `${providerSlug}/${modelSlug}`. */
	modelByKey: Map<string, string>;
}

function parseOrNull(raw: string): CatalogRef | null {
	try {
		return parseCatalogRef(raw);
	} catch {
		return null;
	}
}

/** Per link, per scope ref: the catalog bindings it covers. Every linked
 * limit applies, so overlapping scopes need no tie-break. */
export function resolveRateLimitScopes(
	links: readonly { models: readonly string[] }[],
	catalog: readonly ConcreteBinding[],
): RefCoverage[][] {
	return links.map((link) =>
		link.models.map((raw) => {
			const parsed = parseOrNull(raw);
			const covered = parsed
				? catalog.filter((bnd) => refCovers(parsed, bnd))
				: [];
			return {
				raw,
				parsed,
				coveredBindings: covered,
				models: new Set(covered.map((b) => `${b.provider}/${b.model}`)).size,
				hosts: new Set(covered.map((b) => b.host)).size,
			};
		}),
	);
}

export function formatScope(models: number, hosts: number): string {
	const m = `${models} ${models === 1 ? "model" : "models"}`;
	const h = `${hosts} ${hosts === 1 ? "host" : "hosts"}`;
	return `${m} · ${h}`;
}

export function providerLabel(
	slug: string | undefined,
	labels: LabelLookups,
): string {
	if (!slug) return "—";
	return labels.providerByName.get(slug) ?? slug;
}

export function hostLabel(
	slug: string | undefined,
	labels: LabelLookups,
): string {
	if (!slug) return "—";
	return labels.hostByName.get(slug) ?? slug;
}

export function modelLabel(
	provider: string,
	model: string,
	labels: LabelLookups,
): string {
	return labels.modelByKey.get(`${provider}/${model}`) ?? model;
}

export function uniqueHostLabels(
	bindings: readonly ConcreteBinding[],
	labels: LabelLookups,
): string[] {
	const set = new Set<string>();
	for (const b of bindings) set.add(b.host);
	return [...set].map((slug) => hostLabel(slug, labels));
}

export function joinList(items: readonly string[]): string {
	if (items.length === 0) return "";
	if (items.length === 1) return items[0] ?? "";
	if (items.length === 2) return `${items[0]} and ${items[1]}`;
	return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function describeRef(
	ref: CatalogRef,
	labels: LabelLookups,
	covered: readonly ConcreteBinding[],
): string {
	switch (ref.kind) {
		case "provider": {
			const p = providerLabel(ref.provider, labels);
			const hosts = uniqueHostLabels(covered, labels);
			if (hosts.length === 0) return `All ${p} models`;
			return `All ${p} models hosted by ${joinList(hosts)}`;
		}
		case "provider-on-host":
			return `All ${providerLabel(ref.provider, labels)} models hosted by ${hostLabel(
				ref.host,
				labels,
			)}`;
		case "model": {
			if (!ref.provider || !ref.model) return ref.raw;
			const m = modelLabel(ref.provider, ref.model, labels);
			const hosts = uniqueHostLabels(covered, labels);
			if (hosts.length === 0) return `${m} on any host`;
			return `${m} hosted by ${joinList(hosts)}`;
		}
		case "binding": {
			if (!ref.provider || !ref.model || !ref.host) return ref.raw;
			return `${modelLabel(ref.provider, ref.model, labels)} hosted by ${hostLabel(
				ref.host,
				labels,
			)}`;
		}
		case "host":
			return `Every model hosted by ${hostLabel(ref.host, labels)}`;
	}
}
