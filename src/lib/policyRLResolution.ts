import {
	assignBindingsSpecificityWins,
	type CatalogRef,
	type ConcreteBinding,
	parseCatalogRef,
	refCovers,
} from "@/lib/catalogRef";

export interface RLBindingInput {
	rateLimitId: string;
	models: string[];
}

export interface RefStats {
	raw: string;
	parsed: CatalogRef | null;
	coveredBindings: ConcreteBinding[];
	covered: number;
	kept: number;
	keptModels: number;
	keptHosts: number;
	lostTo: { ownerIdx: number; bindings: ConcreteBinding[] }[];
}

export interface BindingStats {
	refs: RefStats[];
}

export interface Carveout {
	binding: ConcreteBinding;
	winner: number;
	losers: number[];
}

export interface Resolution {
	perBinding: BindingStats[];
	carveouts: Carveout[];
}

export interface LabelLookups {
	providerByName: Map<string, string>;
	hostByName: Map<string, string>;
	/** Keyed by `${providerSlug}/${modelSlug}`. */
	modelByKey: Map<string, string>;
}

export function resolveBindings(
	bindings: readonly RLBindingInput[],
	catalog: readonly ConcreteBinding[],
): Resolution {
	const parsedRefsByBinding: (CatalogRef | null)[][] = bindings.map((b) =>
		b.models.map((s) => {
			try {
				return parseCatalogRef(s);
			} catch {
				return null;
			}
		}),
	);
	const groups = parsedRefsByBinding.map((refs, i) => ({
		owner: i,
		refs: refs.filter((r): r is CatalogRef => r !== null),
	}));
	const { assignments, carveouts } = assignBindingsSpecificityWins(
		groups,
		catalog,
	);

	const perBinding: BindingStats[] = bindings.map((b, i) => {
		const owned = assignments.get(i) ?? [];
		const refs: RefStats[] = b.models.map((raw, refIdx) => {
			const parsed = parsedRefsByBinding[i]?.[refIdx] ?? null;
			if (!parsed) {
				return {
					raw,
					parsed: null,
					coveredBindings: [],
					covered: 0,
					kept: 0,
					keptModels: 0,
					keptHosts: 0,
					lostTo: [],
				};
			}
			const covered = catalog.filter((bnd) => refCovers(parsed, bnd));
			const kept = covered.filter((bnd) => owned.includes(bnd));
			const keptModels = new Set(
				kept.map((bnd) => `${bnd.provider}/${bnd.model}`),
			).size;
			const keptHosts = new Set(kept.map((bnd) => bnd.host)).size;
			// For bindings this ref covers but didn't keep, find the actual winner.
			const lostMap = new Map<number, ConcreteBinding[]>();
			for (const bnd of covered) {
				if (kept.includes(bnd)) continue;
				for (const c of carveouts) {
					if (c.binding === bnd && c.losers.includes(i)) {
						const list = lostMap.get(c.winner) ?? [];
						list.push(bnd);
						lostMap.set(c.winner, list);
						break;
					}
				}
			}
			const lostTo = [...lostMap.entries()].map(([ownerIdx, bnds]) => ({
				ownerIdx,
				bindings: bnds,
			}));
			return {
				raw,
				parsed,
				coveredBindings: covered,
				covered: covered.length,
				kept: kept.length,
				keptModels,
				keptHosts,
				lostTo,
			};
		});
		return { refs };
	});

	return { perBinding, carveouts };
}

export function formatScope(models: number, hosts: number): string {
	const m = `${models} ${models === 1 ? "model" : "models"}`;
	const h = `${hosts} ${hosts === 1 ? "host" : "hosts"}`;
	return `${m} · ${h}`;
}

export function formatScopeFromConcrete(items: readonly ConcreteBinding[]): string {
	const models = new Set(items.map((b) => `${b.provider}/${b.model}`)).size;
	const hosts = new Set(items.map((b) => b.host)).size;
	return formatScope(models, hosts);
}

export function providerLabel(slug: string | undefined, labels: LabelLookups): string {
	if (!slug) return "—";
	return labels.providerByName.get(slug) ?? slug;
}

export function hostLabel(slug: string | undefined, labels: LabelLookups): string {
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
