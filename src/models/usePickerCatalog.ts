import { useMemo } from "react";
import { useCatalogGraph } from "@/api/hooks/catalog";
import type { HostLogoLike } from "@/hosts/HostLogo";
import { type CatalogRef, parseCatalogRef, refCovers } from "@/lib/catalogRef";
import { displayLabel } from "@/lib/displayLabel";

export interface ProviderRow {
	id: string;
	name: string;
	displayName: string;
}

export interface HostRow {
	id: string;
	name: string;
	displayName: string;
	/** Shape consumed by {@link HostLogo} — carries the icon path. */
	logo: HostLogoLike;
}

export interface ModelRow {
	id: string;
	name: string;
	displayName: string;
	provider: string;
	hostNames: string[];
	deprecated: boolean;
}

export interface PickerIndex {
	providers: ProviderRow[];
	hosts: HostRow[];
	hostsByName: Map<string, HostRow>;
	providersByName: Map<string, ProviderRow>;
	modelRows: ModelRow[];
	modelsByProvider: Map<string, ModelRow[]>;
	bindingsByHostName: Map<string, { provider: string; model: string }[]>;
}

/**
 * Picker-ready catalog derived from `/catalog/graph`. The graph is the only
 * source of resolution data: server-built, enabled-filtered, drift-free, and
 * pagination-proof — the picker never re-derives bindings from the heavyweight
 * `/models`/`/hosts`/`/providers` lists.
 *
 * When `restrictTo` is given (a parent policy's allowed catalog), rows are
 * trimmed to only what those refs cover; otherwise the whole graph is exposed.
 */
export function usePickerCatalog(restrictTo?: readonly string[]): PickerIndex {
	const { data: graph } = useCatalogGraph();

	const restrictRefs = useMemo(() => {
		if (!restrictTo) return null;
		const parsed: CatalogRef[] = [];
		for (const s of restrictTo) {
			try {
				parsed.push(parseCatalogRef(s));
			} catch {
				// Skip invalid refs — they can't grant anything.
			}
		}
		return parsed;
	}, [restrictTo]);

	return useMemo(() => buildIndex(graph, restrictRefs), [graph, restrictRefs]);
}

type Graph = ReturnType<typeof useCatalogGraph>["data"];

function buildIndex(
	graph: Graph,
	restrictRefs: readonly CatalogRef[] | null,
): PickerIndex {
	const providerNameById = new Map<string, string>();
	const providerRowByName = new Map<string, ProviderRow>();
	for (const p of graph.providers ?? []) {
		providerNameById.set(p.id, p.name);
		providerRowByName.set(p.name, {
			id: p.id,
			name: p.name,
			displayName: displayLabel(p),
		});
	}

	const hostNameById = new Map<string, string>();
	const hostRowByName = new Map<string, HostRow>();
	for (const h of graph.hosts ?? []) {
		hostNameById.set(h.id, h.name);
		hostRowByName.set(h.name, {
			id: h.id,
			name: h.name,
			displayName: displayLabel(h),
			logo: {
				metadata: { name: h.name, displayName: h.displayName },
				spec: { icon: h.iconPath ? { path: h.iconPath } : undefined },
			},
		});
	}

	const restricted = restrictRefs !== null;
	const usedProviders = new Set<string>();
	const usedHosts = new Set<string>();

	const modelRows: ModelRow[] = [];
	const modelsByProvider = new Map<string, ModelRow[]>();
	const bindingsByHostName = new Map<
		string,
		{ provider: string; model: string }[]
	>();

	for (const m of graph.models ?? []) {
		const provider = providerNameById.get(m.providerId);
		if (!provider) continue;
		const hostNames: string[] = [];
		for (const b of m.bindings ?? []) {
			const host = hostNameById.get(b.hostId);
			if (!host) continue;
			if (
				restricted &&
				!restrictRefs.some((ref) =>
					refCovers(ref, { provider, model: m.name, host }),
				)
			) {
				continue;
			}
			if (!hostNames.includes(host)) hostNames.push(host);
			const list = bindingsByHostName.get(host) ?? [];
			list.push({ provider, model: m.name });
			bindingsByHostName.set(host, list);
			usedHosts.add(host);
		}
		if (restricted && hostNames.length === 0) continue;
		const row: ModelRow = {
			id: m.id,
			name: m.name,
			displayName: displayLabel(m),
			provider,
			hostNames,
			deprecated: Boolean(m.deprecated),
		};
		modelRows.push(row);
		usedProviders.add(provider);
		const byProv = modelsByProvider.get(provider) ?? [];
		byProv.push(row);
		modelsByProvider.set(provider, byProv);
	}

	const providers = [...providerRowByName.values()].filter(
		(p) => !restricted || usedProviders.has(p.name),
	);
	const hosts = [...hostRowByName.values()].filter(
		(h) => !restricted || usedHosts.has(h.name),
	);

	return {
		providers,
		hosts,
		hostsByName: new Map(hosts.map((h) => [h.name, h])),
		providersByName: new Map(providers.map((p) => [p.name, p])),
		modelRows,
		modelsByProvider,
		bindingsByHostName,
	};
}
